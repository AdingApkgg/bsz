//! Site keys management handlers

use axum::extract::Query;
use axum::response::{IntoResponse, Json};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::atomic::{AtomicU64, Ordering};

use crate::state::STORE;

#[derive(Debug, Deserialize)]
pub struct ListKeysParams {
    pub cursor: Option<usize>,
    pub count: Option<usize>,
}

#[derive(Debug, Serialize)]
pub struct KeyInfo {
    pub site_hash: String,
    pub host: Option<String>,
    pub site_pv: u64,
    pub site_uv: u64,
    pub page_count: usize,
}

/// GET /api/admin/keys
pub async fn list_keys_handler(Query(params): Query<ListKeysParams>) -> impl IntoResponse {
    let cursor = params.cursor.unwrap_or(0);
    let count = params.count.unwrap_or(20);

    let mut keys: Vec<KeyInfo> = Vec::new();

    for (i, entry) in STORE.site_pv.iter().enumerate() {
        if i < cursor {
            continue;
        }
        if keys.len() >= count {
            break;
        }

        let site_hash = entry.key().clone();
        let site_pv = entry.value().load(Ordering::Relaxed);
        let site_uv = STORE
            .site_uv
            .get(&site_hash)
            .map(|v| v.load(Ordering::Relaxed))
            .unwrap_or(0);

        let prefix = format!("{}:", site_hash);
        let page_count = STORE
            .page_pv
            .iter()
            .filter(|p| p.key().starts_with(&prefix))
            .count();

        let host = STORE.site_hosts.get(&site_hash).map(|v| v.clone());

        keys.push(KeyInfo {
            site_hash,
            host,
            site_pv,
            site_uv,
            page_count,
        });
    }

    let next_cursor = if keys.len() == count {
        cursor + count
    } else {
        0
    };

    Json(json!({
        "success": true,
        "data": keys,
        "next_cursor": next_cursor
    }))
}

#[derive(Debug, Deserialize)]
pub struct DeleteKeyParams {
    pub site_hash: String,
    pub page_key: Option<String>,
}

/// DELETE /api/admin/keys
pub async fn delete_key_handler(Query(params): Query<DeleteKeyParams>) -> impl IntoResponse {
    // If page_key is provided, delete single page; otherwise delete entire site
    if let Some(page_key) = &params.page_key {
        STORE.page_pv.remove(page_key);
        STORE.page_paths.remove(page_key);

        return Json(json!({
            "success": true,
            "message": "page deleted"
        }));
    }

    let hash = &params.site_hash;

    STORE.site_pv.remove(hash);
    STORE.site_uv.remove(hash);
    STORE.site_visitors.remove(hash);
    STORE.site_hosts.remove(hash);

    let prefix = format!("{}:", hash);
    STORE.page_pv.retain(|k, _| !k.starts_with(&prefix));
    STORE.page_paths.retain(|k, _| !k.starts_with(&prefix));

    Json(json!({
        "success": true,
        "message": "site deleted"
    }))
}

#[derive(Debug, Deserialize)]
pub struct UpdateKeyParams {
    pub site_hash: String,
    pub key_type: String,
    pub value: Option<u64>,
}

/// POST /api/admin/keys/update
pub async fn update_key_handler(Json(params): Json<UpdateKeyParams>) -> impl IntoResponse {
    let hash = &params.site_hash;

    match params.key_type.as_str() {
        "site_pv" => {
            if let Some(val) = params.value {
                STORE
                    .site_pv
                    .entry(hash.to_string())
                    .or_insert_with(|| AtomicU64::new(0))
                    .store(val, Ordering::Relaxed);
            }
        }
        "site_uv" => {
            if let Some(val) = params.value {
                STORE
                    .site_uv
                    .entry(hash.to_string())
                    .or_insert_with(|| AtomicU64::new(0))
                    .store(val, Ordering::Relaxed);
            } else {
                // Reset to 0 and clear visitors
                if let Some(uv) = STORE.site_uv.get(hash) {
                    uv.store(0, Ordering::Relaxed);
                }
                if let Some(visitors) = STORE.site_visitors.get(hash) {
                    visitors.clear();
                }
            }
        }
        _ => {
            return Json(json!({
                "success": false,
                "message": "invalid key_type"
            }));
        }
    }

    Json(json!({
        "success": true,
        "message": "updated"
    }))
}
