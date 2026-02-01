//! In-memory data store with SQLite persistence

use dashmap::{DashMap, DashSet};
use once_cell::sync::Lazy;
use rusqlite::{params, Connection};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;

const DB_FILE: &str = "data.db";

/// Global data store
/// Only 3 metrics: site_pv, site_uv, page_pv (matching original busuanzi)
pub struct Store {
    pub site_pv: DashMap<String, AtomicU64>,
    pub site_uv: DashMap<String, AtomicU64>,
    pub site_visitors: DashMap<String, DashSet<u64>>,
    pub page_pv: DashMap<String, AtomicU64>,
    pub site_hosts: DashMap<String, String>,
    pub page_paths: DashMap<String, String>,
}

impl Store {
    pub fn new() -> Self {
        Self {
            site_pv: DashMap::new(),
            site_uv: DashMap::new(),
            site_visitors: DashMap::new(),
            page_pv: DashMap::new(),
            site_hosts: DashMap::new(),
            page_paths: DashMap::new(),
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
            hash TEXT PRIMARY KEY,
            pv INTEGER NOT NULL DEFAULT 0,
            uv INTEGER NOT NULL DEFAULT 0,
            host TEXT
        );
        CREATE TABLE IF NOT EXISTS pages (
            key TEXT PRIMARY KEY,
            pv INTEGER NOT NULL DEFAULT 0,
            path TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_pages_site ON pages(key);
        ",
    )?;
    Ok(())
}

/// Save store to SQLite
pub async fn save() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // Run in blocking task since rusqlite is sync
    tokio::task::spawn_blocking(|| save_sync()).await??;
    Ok(())
}

fn save_sync() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let conn = DB.lock().unwrap();
    let tx = conn.unchecked_transaction()?;

    // Upsert sites
    {
        let mut stmt = tx.prepare_cached(
            "INSERT INTO sites (hash, pv, uv, host) VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(hash) DO UPDATE SET pv=?2, uv=?3, host=COALESCE(?4, host)",
        )?;

        for entry in STORE.site_pv.iter() {
            let hash = entry.key();
            let pv = entry.value().load(Ordering::Relaxed);
            let uv = STORE
                .site_uv
                .get(hash)
                .map(|v| v.load(Ordering::Relaxed))
                .unwrap_or(0);
            let host = STORE.site_hosts.get(hash).map(|v| v.clone());

            stmt.execute(params![hash, pv as i64, uv as i64, host])?;
        }
    }

    // Upsert pages
    {
        let mut stmt = tx.prepare_cached(
            "INSERT INTO pages (key, pv, path) VALUES (?1, ?2, ?3)
             ON CONFLICT(key) DO UPDATE SET pv=?2, path=COALESCE(?3, path)",
        )?;

        for entry in STORE.page_pv.iter() {
            let key = entry.key();
            let pv = entry.value().load(Ordering::Relaxed);
            let path = STORE.page_paths.get(key).map(|v| v.clone());

            stmt.execute(params![key, pv as i64, path])?;
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
        let mut stmt = conn.prepare("SELECT hash, pv, uv, host FROM sites")?;
        let rows = stmt.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, Option<String>>(3)?,
            ))
        })?;

        for row in rows {
            let (hash, pv, uv, host) = row?;
            STORE.site_pv.insert(hash.clone(), AtomicU64::new(pv as u64));
            STORE.site_uv.insert(hash.clone(), AtomicU64::new(uv as u64));
            STORE.site_visitors.insert(hash.clone(), DashSet::new());
            if let Some(h) = host {
                STORE.site_hosts.insert(hash, h);
            }
        }
    }

    // Load pages
    {
        let mut stmt = conn.prepare("SELECT key, pv, path FROM pages")?;
        let rows = stmt.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, Option<String>>(2)?,
            ))
        })?;

        for row in rows {
            let (key, pv, path) = row?;
            STORE.page_pv.insert(key.clone(), AtomicU64::new(pv as u64));
            if let Some(p) = path {
                STORE.page_paths.insert(key, p);
            }
        }
    }

    tracing::info!(
        "Loaded {} sites, {} pages from {}",
        STORE.site_pv.len(),
        STORE.page_pv.len(),
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
pub fn incr_site(site_hash: &str, user_identity: &str) -> (u64, u64) {
    let pv = STORE
        .site_pv
        .entry(site_hash.to_string())
        .or_insert_with(|| AtomicU64::new(0))
        .fetch_add(1, Ordering::Relaxed)
        + 1;

    let vh = visitor_hash(user_identity);
    let visitors = STORE
        .site_visitors
        .entry(site_hash.to_string())
        .or_insert_with(DashSet::new);

    let is_new = visitors.insert(vh);

    let uv = if is_new {
        STORE
            .site_uv
            .entry(site_hash.to_string())
            .or_insert_with(|| AtomicU64::new(0))
            .fetch_add(1, Ordering::Relaxed)
            + 1
    } else {
        STORE
            .site_uv
            .get(site_hash)
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

pub fn get_site(site_hash: &str) -> (u64, u64) {
    let pv = STORE
        .site_pv
        .get(site_hash)
        .map(|v| v.load(Ordering::Relaxed))
        .unwrap_or(0);
    let uv = STORE
        .site_uv
        .get(site_hash)
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

/// Store URL mappings for admin display
pub fn set_url_mapping(site_hash: &str, page_key: &str, host: &str, path: &str) {
    STORE
        .site_hosts
        .entry(site_hash.to_string())
        .or_insert_with(|| host.to_string());
    STORE
        .page_paths
        .entry(page_key.to_string())
        .or_insert_with(|| path.to_string());
}
