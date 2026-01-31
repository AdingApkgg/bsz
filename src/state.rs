//! In-memory data store with background persistence (JSON format)

use dashmap::{DashMap, DashSet};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use std::sync::atomic::{AtomicU64, Ordering};

const DATA_FILE: &str = "data.json";

/// Global data store
/// Only 3 metrics: site_pv, site_uv, page_pv (matching original busuanzi)
pub struct Store {
    /// site_hash -> pv
    pub site_pv: DashMap<String, AtomicU64>,
    /// site_hash -> uv
    pub site_uv: DashMap<String, AtomicU64>,
    /// site_hash -> Set of visitor hashes (for UV dedup)
    pub site_visitors: DashMap<String, DashSet<u64>>,
    /// page_key (site_hash:page_hash) -> pv
    pub page_pv: DashMap<String, AtomicU64>,
    /// URL mappings for display
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

// ==================== Serialization ====================

/// Site data for JSON storage
#[derive(Serialize, Deserialize, Default)]
struct SiteEntry {
    pv: u64,
    uv: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    host: Option<String>,
}

/// Page data for JSON storage  
#[derive(Serialize, Deserialize, Default)]
struct PageEntry {
    pv: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    path: Option<String>,
}

#[derive(Serialize, Deserialize, Default)]
struct PersistedData {
    /// site_hash -> { pv, uv, host? }
    sites: HashMap<String, SiteEntry>,
    /// page_key -> { pv, path? }
    pages: HashMap<String, PageEntry>,
}

/// Save store to JSON file
pub async fn save() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let mut data = PersistedData::default();

    for entry in STORE.site_pv.iter() {
        let hash = entry.key().clone();
        let pv = entry.value().load(Ordering::Relaxed);
        let uv = STORE
            .site_uv
            .get(&hash)
            .map(|v| v.load(Ordering::Relaxed))
            .unwrap_or(0);
        let host = STORE.site_hosts.get(&hash).map(|v| v.clone());

        data.sites.insert(hash, SiteEntry { pv, uv, host });
    }

    for entry in STORE.page_pv.iter() {
        let key = entry.key().clone();
        let pv = entry.value().load(Ordering::Relaxed);
        let path = STORE.page_paths.get(&key).map(|v| v.clone());

        data.pages.insert(key, PageEntry { pv, path });
    }

    let json = serde_json::to_string_pretty(&data)?;
    tokio::fs::write(DATA_FILE, json).await?;

    tracing::debug!(
        "Saved {} sites, {} pages to {}",
        data.sites.len(),
        data.pages.len(),
        DATA_FILE
    );
    Ok(())
}

/// Load store from JSON file
pub fn load() -> Result<(), Box<dyn std::error::Error>> {
    let path = Path::new(DATA_FILE);
    if !path.exists() {
        tracing::info!("No data file found, starting fresh");
        return Ok(());
    }

    let content = std::fs::read_to_string(path)?;
    let data: PersistedData = serde_json::from_str(&content)?;

    for (hash, site) in data.sites {
        STORE.site_pv.insert(hash.clone(), AtomicU64::new(site.pv));
        STORE.site_uv.insert(hash.clone(), AtomicU64::new(site.uv));
        STORE.site_visitors.insert(hash.clone(), DashSet::new());
        if let Some(host) = site.host {
            STORE.site_hosts.insert(hash, host);
        }
    }

    for (key, page) in data.pages {
        STORE.page_pv.insert(key.clone(), AtomicU64::new(page.pv));
        if let Some(path) = page.path {
            STORE.page_paths.insert(key, path);
        }
    }

    tracing::info!(
        "Loaded {} sites, {} pages from {}",
        STORE.site_pv.len(),
        STORE.page_pv.len(),
        DATA_FILE
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

/// Increment page PV only (no page UV in original busuanzi)
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
    STORE.site_hosts.entry(site_hash.to_string()).or_insert_with(|| host.to_string());
    STORE.page_paths.entry(page_key.to_string()).or_insert_with(|| path.to_string());
}
