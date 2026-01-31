//! Counting logic - matches original busuanzi: site_pv, site_uv, page_pv only

use crate::config::CONFIG;
use crate::state;

#[derive(Debug, serde::Serialize)]
pub struct Counts {
    pub site_pv: u64,
    pub site_uv: u64,
    pub page_pv: u64,
}

pub struct Keys {
    pub site_hash: String,
    pub page_key: String,
}

pub fn get_keys(host: &str, path: &str) -> Keys {
    let site_unique = host.to_string();
    let path_unique = if CONFIG.bsz_path_style {
        path.to_string()
    } else {
        format!("{}&{}", host, path)
    };

    let encrypt_md5 = |s: &str| -> String {
        let digest = md5::compute(s);
        format!("{:x}", digest)
    };

    let (site_hash, page_hash) = match CONFIG.bsz_encrypt.as_str() {
        "MD516" => {
            let s = encrypt_md5(&site_unique);
            let p = encrypt_md5(&path_unique);
            (s[8..24].to_string(), p[8..24].to_string())
        }
        _ => (encrypt_md5(&site_unique), encrypt_md5(&path_unique)),
    };

    Keys {
        site_hash: site_hash.clone(),
        page_key: format!("{}:{}", site_hash, page_hash),
    }
}

/// Count and return PV/UV (POST /api)
pub fn count(host: &str, path: &str, user_identity: &str) -> Counts {
    let keys = get_keys(host, path);

    // Store URL mappings for admin display
    state::set_url_mapping(&keys.site_hash, &keys.page_key, host, path);

    let (site_pv, site_uv) = state::incr_site(&keys.site_hash, user_identity);
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

    let (site_pv, site_uv) = state::get_site(&keys.site_hash);
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
    state::incr_site(&keys.site_hash, user_identity);
    state::incr_page(&keys.page_key);
}
