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
        ",
    )?;
    Ok(())
}

/// Save store to SQLite
pub async fn save() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // Run in blocking task since rusqlite is sync
    tokio::task::spawn_blocking(save_sync).await??;
    Ok(())
}

fn save_sync() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let conn = DB.lock().unwrap();
    let tx = conn.unchecked_transaction()?;

    // Upsert sites
    {
        let mut stmt = tx.prepare_cached(
            "INSERT INTO sites (key, pv, uv) VALUES (?1, ?2, ?3)
             ON CONFLICT(key) DO UPDATE SET pv=?2, uv=?3",
        )?;

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

    // Upsert pages
    {
        let mut stmt = tx.prepare_cached(
            "INSERT INTO pages (key, pv) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET pv=?2",
        )?;

        for entry in STORE.page_pv.iter() {
            let key = entry.key();
            let pv = entry.value().load(Ordering::Relaxed);

            stmt.execute(params![key, pv as i64])?;
        }
    }

    // Insert new visitors (incremental)
    {
        let mut new_visitors = STORE.new_visitors.write().unwrap();
        if !new_visitors.is_empty() {
            let mut stmt = tx.prepare_cached(
                "INSERT OR IGNORE INTO visitors (site_key, hash) VALUES (?1, ?2)",
            )?;

            for (site_key, hash) in new_visitors.drain(..) {
                stmt.execute(params![site_key, hash as i64])?;
            }
        }
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
            STORE
                .site_pv
                .insert(key.clone(), AtomicU64::new(pv as u64));
            STORE
                .site_uv
                .insert(key.clone(), AtomicU64::new(uv as u64));
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
    let visitors = STORE
        .site_visitors
        .entry(site_key.to_string())
        .or_default();

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
