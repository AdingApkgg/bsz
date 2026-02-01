//! Counting logic - matches original busuanzi: site_pv, site_uv, page_pv only

use crate::state;

#[derive(Debug, serde::Serialize)]
pub struct Counts {
    pub site_pv: u64,
    pub site_uv: u64,
    pub page_pv: u64,
}

pub struct Keys {
    pub site_key: String,
    pub page_key: String,
}

/// Generate keys directly from host and path (no hashing)
pub fn get_keys(host: &str, path: &str) -> Keys {
    Keys {
        site_key: host.to_string(),
        page_key: format!("{}:{}", host, path),
    }
}

/// Count and return PV/UV (POST /api)
pub fn count(host: &str, path: &str, user_identity: &str) -> Counts {
    let keys = get_keys(host, path);

    let (site_pv, site_uv) = state::incr_site(&keys.site_key, user_identity);
    let page_pv = state::incr_page(&keys.page_key);

    Counts {
        site_pv,
        site_uv,
        page_pv,
    }
}

/// Get counts without incrementing (GET /api)
pub fn get(host: &str, path: &str) -> Counts {
    let keys = get_keys(host, path);

    let (site_pv, site_uv) = state::get_site(&keys.site_key);
    let page_pv = state::get_page(&keys.page_key);

    Counts {
        site_pv,
        site_uv,
        page_pv,
    }
}

/// Put data without returning (PUT /api)
pub fn put(host: &str, path: &str, user_identity: &str) {
    let keys = get_keys(host, path);
    state::incr_site(&keys.site_key, user_identity);
    state::incr_page(&keys.page_key);
}
