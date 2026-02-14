//! In-memory data store with SQLite persistence

use dashmap::{DashMap, DashSet};
use once_cell::sync::Lazy;
use rusqlite::{params, Connection};
use std::collections::HashSet;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Mutex, RwLock};

const DB_FILE: &str = "data.db";

/// Global data store
/// Only 3 metrics: site_pv, site_uv, page_pv (matching original busuanzi)
/// Keys are plaintext: site_key = host, page_key = host:path
pub struct Store {
    pub site_pv: DashMap<String, AtomicU64>,
    pub site_uv: DashMap<String, AtomicU64>,
    pub site_visitors: DashMap<String, DashSet<u64>>,
    pub page_pv: DashMap<String, AtomicU64>,
    /// Track new visitors since last save (for incremental persistence)
    pub new_visitors: RwLock<Vec<(String, u64)>>,
}

impl Store {
    pub fn new() -> Self {
        Self {
            site_pv: DashMap::new(),
            site_uv: DashMap::new(),
            site_visitors: DashMap::new(),
            page_pv: DashMap::new(),
            new_visitors: RwLock::new(Vec::new()),
        }
    }
}

pub static STORE: Lazy<Store> = Lazy::new(Store::new);

// SQLite connection (single writer)
static DB: Lazy<Mutex<Connection>> = Lazy::new(|| {
    let conn = Connection::open(DB_FILE).expect("Failed to open database");
    init_db(&conn).expect("Failed to initialize database");
    Mutex::new(conn)
});

fn init_db(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS sites (
            key TEXT PRIMARY KEY,
            pv INTEGER NOT NULL DEFAULT 0,
            uv INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS pages (
            key TEXT PRIMARY KEY,
            pv INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS visitors (
            site_key TEXT NOT NULL,
            hash INTEGER NOT NULL,
            PRIMARY KEY (site_key, hash)
        );
        CREATE INDEX IF NOT EXISTS idx_visitors_site ON visitors(site_key);
        CREATE TABLE IF NOT EXISTS operation_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            action TEXT NOT NULL,
            detail TEXT NOT NULL DEFAULT '',
            ip TEXT NOT NULL DEFAULT ''
        );
        ",
    )?;
    Ok(())
}

/// Add an operation log entry
pub fn add_log(action: &str, detail: &str, ip: &str) {
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    if let Ok(conn) = DB.lock() {
        let _ = conn.execute(
            "INSERT INTO operation_logs (timestamp, action, detail, ip) VALUES (?1, ?2, ?3, ?4)",
            params![now, action, detail, ip],
        );
    }
}

/// A single operation log entry: (id, timestamp, action, detail, ip)
pub type LogEntry = (i64, String, String, String, String);

/// Query operation logs with pagination
pub fn query_logs(
    page: usize,
    size: usize,
) -> Result<(Vec<LogEntry>, usize), Box<dyn std::error::Error>> {
    let conn = DB.lock().unwrap();
    let total: i64 = conn.query_row("SELECT COUNT(*) FROM operation_logs", [], |r| {
        r.get::<_, i64>(0)
    })?;
    let total = total as usize;

    let offset = (page.saturating_sub(1)) * size;
    let mut stmt = conn.prepare(
        "SELECT id, timestamp, action, detail, ip FROM operation_logs ORDER BY id DESC LIMIT ?1 OFFSET ?2",
    )?;
    let rows = stmt
        .query_map(params![size as i64, offset as i64], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
            ))
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok((rows, total))
}

/// Save store to SQLite (async wrapper)
pub async fn save() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    tokio::task::spawn_blocking(save_sync).await??;
    Ok(())
}

/// Save store to SQLite (blocking, for use inside spawn_blocking)
pub fn save_blocking() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    save_sync()
}

fn save_sync() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let conn = DB.lock().unwrap();
    let tx = conn.unchecked_transaction()?;

    // Clear all tables and rewrite (ensures deletions are persisted)
    tx.execute_batch("DELETE FROM sites; DELETE FROM pages; DELETE FROM visitors;")?;

    // Write all sites
    {
        let mut stmt = tx.prepare_cached("INSERT INTO sites (key, pv, uv) VALUES (?1, ?2, ?3)")?;

        for entry in STORE.site_pv.iter() {
            let key = entry.key();
            let pv = entry.value().load(Ordering::Relaxed);
            let uv = STORE
                .site_uv
                .get(key)
                .map(|v| v.load(Ordering::Relaxed))
                .unwrap_or(0);

            stmt.execute(params![key, pv as i64, uv as i64])?;
        }
    }

    // Write all pages
    {
        let mut stmt = tx.prepare_cached("INSERT INTO pages (key, pv) VALUES (?1, ?2)")?;

        for entry in STORE.page_pv.iter() {
            let key = entry.key();
            let pv = entry.value().load(Ordering::Relaxed);

            stmt.execute(params![key, pv as i64])?;
        }
    }

    // Write all visitors
    {
        let mut stmt =
            tx.prepare_cached("INSERT INTO visitors (site_key, hash) VALUES (?1, ?2)")?;

        for entry in STORE.site_visitors.iter() {
            let site_key = entry.key();
            for vh in entry.value().iter() {
                stmt.execute(params![site_key, *vh as i64])?;
            }
        }

        // Clear incremental tracker
        STORE.new_visitors.write().unwrap().clear();
    }

    tx.commit()?;

    tracing::debug!(
        "Saved {} sites, {} pages to {}",
        STORE.site_pv.len(),
        STORE.page_pv.len(),
        DB_FILE
    );
    Ok(())
}

/// Atomically import data from an external SQLite file.
/// Holds DB lock during entire operation to prevent races with background save.
/// Returns (sites_count, pages_count, visitors_count).
pub fn import_from_file(
    temp_path: &str,
) -> Result<(i64, i64, i64), Box<dyn std::error::Error + Send + Sync>> {
    // Lock main DB first — blocks background save_sync
    let conn = DB.lock().unwrap();

    // Open uploaded temp database
    let temp_conn =
        Connection::open(temp_path).map_err(|e| format!("打开临时数据库失败: {}", e))?;

    // Read counts
    let sites_count: i64 = temp_conn
        .query_row("SELECT COUNT(*) FROM sites", [], |r| r.get(0))
        .map_err(|e| format!("读取 sites 表失败: {}", e))?;
    let pages_count: i64 = temp_conn
        .query_row("SELECT COUNT(*) FROM pages", [], |r| r.get(0))
        .map_err(|e| format!("读取 pages 表失败: {}", e))?;

    // ---- Clear STORE ----
    STORE.site_pv.clear();
    STORE.site_uv.clear();
    STORE.site_visitors.clear();
    STORE.page_pv.clear();
    STORE.new_visitors.write().unwrap().clear();

    // ---- Load from temp into STORE ----
    // Sites
    {
        let mut stmt = temp_conn.prepare("SELECT key, pv, uv FROM sites")?;
        let rows = stmt.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, i64>(2)?,
            ))
        })?;
        for row in rows {
            let (key, pv, uv) = row?;
            STORE.site_pv.insert(key.clone(), AtomicU64::new(pv as u64));
            STORE.site_uv.insert(key.clone(), AtomicU64::new(uv as u64));
            STORE.site_visitors.insert(key, dashmap::DashSet::new());
        }
    }

    // Visitors (optional table in older exports)
    let mut visitor_count = 0i64;
    if let Ok(mut stmt) = temp_conn.prepare("SELECT site_key, hash FROM visitors") {
        if let Ok(rows) = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
        }) {
            for row in rows.flatten() {
                let (site_key, hash) = row;
                let set = STORE.site_visitors.entry(site_key).or_default();
                set.insert(hash as u64);
                visitor_count += 1;
            }
        }
    }

    // Pages
    {
        let mut stmt = temp_conn.prepare("SELECT key, pv FROM pages")?;
        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
        })?;
        for row in rows {
            let (key, pv) = row?;
            STORE.page_pv.insert(key, AtomicU64::new(pv as u64));
        }
    }

    drop(temp_conn);

    // ---- Persist to main DB immediately (still holding lock) ----
    let tx = conn.unchecked_transaction()?;
    tx.execute_batch("DELETE FROM sites; DELETE FROM pages; DELETE FROM visitors;")?;

    {
        let mut stmt = tx.prepare_cached("INSERT INTO sites (key, pv, uv) VALUES (?1, ?2, ?3)")?;
        for entry in STORE.site_pv.iter() {
            let key = entry.key();
            let pv = entry.value().load(Ordering::Relaxed);
            let uv = STORE
                .site_uv
                .get(key)
                .map(|v| v.load(Ordering::Relaxed))
                .unwrap_or(0);
            stmt.execute(params![key, pv as i64, uv as i64])?;
        }
    }
    {
        let mut stmt = tx.prepare_cached("INSERT INTO pages (key, pv) VALUES (?1, ?2)")?;
        for entry in STORE.page_pv.iter() {
            let key = entry.key();
            let pv = entry.value().load(Ordering::Relaxed);
            stmt.execute(params![key, pv as i64])?;
        }
    }
    {
        let mut stmt =
            tx.prepare_cached("INSERT INTO visitors (site_key, hash) VALUES (?1, ?2)")?;
        for entry in STORE.site_visitors.iter() {
            let site_key = entry.key();
            for vh in entry.value().iter() {
                stmt.execute(params![site_key, *vh as i64])?;
            }
        }
    }

    tx.commit()?;

    tracing::info!(
        "Imported {} sites, {} pages, {} visitors",
        sites_count,
        pages_count,
        visitor_count
    );
    Ok((sites_count, pages_count, visitor_count))
}

/// Load store from SQLite
pub fn load() -> Result<(), Box<dyn std::error::Error>> {
    let conn = DB.lock().unwrap();

    // Load sites
    {
        let mut stmt = conn.prepare("SELECT key, pv, uv FROM sites")?;
        let rows = stmt.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, i64>(2)?,
            ))
        })?;

        for row in rows {
            let (key, pv, uv) = row?;
            STORE.site_pv.insert(key.clone(), AtomicU64::new(pv as u64));
            STORE.site_uv.insert(key.clone(), AtomicU64::new(uv as u64));
            STORE.site_visitors.insert(key, DashSet::new());
        }
    }

    // Load pages
    {
        let mut stmt = conn.prepare("SELECT key, pv FROM pages")?;
        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
        })?;

        for row in rows {
            let (key, pv) = row?;
            STORE.page_pv.insert(key, AtomicU64::new(pv as u64));
        }
    }

    // Load visitors
    let mut visitor_count = 0usize;
    {
        let mut stmt = conn.prepare("SELECT site_key, hash FROM visitors")?;
        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
        })?;

        // Group by site_key for efficiency
        let mut site_visitors: std::collections::HashMap<String, HashSet<u64>> =
            std::collections::HashMap::new();

        for row in rows {
            let (site_key, hash) = row?;
            site_visitors
                .entry(site_key)
                .or_default()
                .insert(hash as u64);
            visitor_count += 1;
        }

        for (site_key, visitors) in site_visitors {
            let set = STORE.site_visitors.entry(site_key).or_default();
            for vh in visitors {
                set.insert(vh);
            }
        }
    }

    tracing::info!(
        "Loaded {} sites, {} pages, {} visitors from {}",
        STORE.site_pv.len(),
        STORE.page_pv.len(),
        visitor_count,
        DB_FILE
    );
    Ok(())
}

// ==================== Operations ====================

fn visitor_hash(identity: &str) -> u64 {
    use std::hash::{Hash, Hasher};
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    identity.hash(&mut hasher);
    hasher.finish()
}

/// Increment site stats, returns (pv, uv)
pub fn incr_site(site_key: &str, user_identity: &str) -> (u64, u64) {
    let pv = STORE
        .site_pv
        .entry(site_key.to_string())
        .or_insert_with(|| AtomicU64::new(0))
        .fetch_add(1, Ordering::Relaxed)
        + 1;

    let vh = visitor_hash(user_identity);
    let visitors = STORE.site_visitors.entry(site_key.to_string()).or_default();

    let is_new = visitors.insert(vh);

    let uv = if is_new {
        // Track new visitor for persistence
        STORE
            .new_visitors
            .write()
            .unwrap()
            .push((site_key.to_string(), vh));

        STORE
            .site_uv
            .entry(site_key.to_string())
            .or_insert_with(|| AtomicU64::new(0))
            .fetch_add(1, Ordering::Relaxed)
            + 1
    } else {
        STORE
            .site_uv
            .get(site_key)
            .map(|v| v.load(Ordering::Relaxed))
            .unwrap_or(0)
    };

    (pv, uv)
}

/// Increment page PV only
pub fn incr_page(page_key: &str) -> u64 {
    STORE
        .page_pv
        .entry(page_key.to_string())
        .or_insert_with(|| AtomicU64::new(0))
        .fetch_add(1, Ordering::Relaxed)
        + 1
}

pub fn get_site(site_key: &str) -> (u64, u64) {
    let pv = STORE
        .site_pv
        .get(site_key)
        .map(|v| v.load(Ordering::Relaxed))
        .unwrap_or(0);
    let uv = STORE
        .site_uv
        .get(site_key)
        .map(|v| v.load(Ordering::Relaxed))
        .unwrap_or(0);
    (pv, uv)
}

pub fn get_page(page_key: &str) -> u64 {
    STORE
        .page_pv
        .get(page_key)
        .map(|v| v.load(Ordering::Relaxed))
        .unwrap_or(0)
}
