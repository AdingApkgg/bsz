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
    pub site_key: String,
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

        let site_key = entry.key().clone();
        let site_pv = entry.value().load(Ordering::Relaxed);
        let site_uv = STORE
            .site_uv
            .get(&site_key)
            .map(|v| v.load(Ordering::Relaxed))
            .unwrap_or(0);

        let prefix = format!("{}:", site_key);
        let page_count = STORE
            .page_pv
            .iter()
            .filter(|p| p.key().starts_with(&prefix))
            .count();

        keys.push(KeyInfo {
            site_key,
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
    pub site_key: String,
    pub page_key: Option<String>,
}

/// DELETE /api/admin/keys
pub async fn delete_key_handler(Query(params): Query<DeleteKeyParams>) -> impl IntoResponse {
    // If page_key is provided, delete single page; otherwise delete entire site
    if let Some(page_key) = &params.page_key {
        STORE.page_pv.remove(page_key);

        return Json(json!({
            "success": true,
            "message": "page deleted"
        }));
    }

    let key = &params.site_key;

    STORE.site_pv.remove(key);
    STORE.site_uv.remove(key);
    STORE.site_visitors.remove(key);

    let prefix = format!("{}:", key);
    STORE.page_pv.retain(|k, _| !k.starts_with(&prefix));

    Json(json!({
        "success": true,
        "message": "site deleted"
    }))
}

#[derive(Debug, Deserialize)]
pub struct UpdateKeyParams {
    pub site_key: String,
    pub key_type: String,
    pub value: Option<u64>,
}

/// POST /api/admin/keys/update
pub async fn update_key_handler(Json(params): Json<UpdateKeyParams>) -> impl IntoResponse {
    let key = &params.site_key;

    match params.key_type.as_str() {
        "site_pv" => {
            if let Some(val) = params.value {
                STORE
                    .site_pv
                    .entry(key.to_string())
                    .or_insert_with(|| AtomicU64::new(0))
                    .store(val, Ordering::Relaxed);
            }
        }
        "site_uv" => {
            if let Some(val) = params.value {
                STORE
                    .site_uv
                    .entry(key.to_string())
                    .or_insert_with(|| AtomicU64::new(0))
                    .store(val, Ordering::Relaxed);
            } else {
                // Reset to 0 and clear visitors
                if let Some(uv) = STORE.site_uv.get(key) {
                    uv.store(0, Ordering::Relaxed);
                }
                if let Some(visitors) = STORE.site_visitors.get(key) {
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

#[derive(Debug, Deserialize)]
pub struct RenameKeyParams {
    pub old_key: String,
    pub new_key: String,
}

/// POST /api/admin/keys/rename - Rename a site (change domain)
pub async fn rename_key_handler(Json(params): Json<RenameKeyParams>) -> impl IntoResponse {
    let old_key = &params.old_key;
    let new_key = &params.new_key;

    if old_key == new_key {
        return Json(json!({
            "success": false,
            "message": "新旧域名相同"
        }));
    }

    // Check if old site exists
    if !STORE.site_pv.contains_key(old_key) {
        return Json(json!({
            "success": false,
            "message": "源站点不存在"
        }));
    }

    // Check if new site already exists
    if STORE.site_pv.contains_key(new_key) {
        return Json(json!({
            "success": false,
            "message": "目标站点已存在，请使用合并功能"
        }));
    }

    // Move site stats
    if let Some((_, pv)) = STORE.site_pv.remove(old_key) {
        STORE.site_pv.insert(new_key.clone(), pv);
    }
    if let Some((_, uv)) = STORE.site_uv.remove(old_key) {
        STORE.site_uv.insert(new_key.clone(), uv);
    }
    if let Some((_, visitors)) = STORE.site_visitors.remove(old_key) {
        STORE.site_visitors.insert(new_key.clone(), visitors);
    }

    // Move page stats (rename keys)
    let old_prefix = format!("{}:", old_key);
    let pages_to_move: Vec<_> = STORE
        .page_pv
        .iter()
        .filter(|e| e.key().starts_with(&old_prefix))
        .map(|e| (e.key().clone(), e.value().load(Ordering::Relaxed)))
        .collect();

    for (old_page_key, pv) in pages_to_move {
        STORE.page_pv.remove(&old_page_key);
        let path = old_page_key.strip_prefix(&old_prefix).unwrap_or("");
        let new_page_key = format!("{}:{}", new_key, path);
        STORE.page_pv.insert(new_page_key, AtomicU64::new(pv));
    }

    Json(json!({
        "success": true,
        "message": format!("已将 {} 重命名为 {}", old_key, new_key)
    }))
}

#[derive(Debug, Deserialize)]
pub struct MergeKeyParams {
    pub source_key: String,
    pub target_key: String,
}

/// POST /api/admin/keys/merge - Merge source site into target site
pub async fn merge_key_handler(Json(params): Json<MergeKeyParams>) -> impl IntoResponse {
    let source = &params.source_key;
    let target = &params.target_key;

    if source == target {
        return Json(json!({
            "success": false,
            "message": "源和目标站点相同"
        }));
    }

    // Check if source exists
    if !STORE.site_pv.contains_key(source) {
        return Json(json!({
            "success": false,
            "message": "源站点不存在"
        }));
    }

    // Merge site PV (add)
    let source_pv = STORE
        .site_pv
        .get(source)
        .map(|v| v.load(Ordering::Relaxed))
        .unwrap_or(0);
    STORE
        .site_pv
        .entry(target.to_string())
        .or_insert_with(|| AtomicU64::new(0))
        .fetch_add(source_pv, Ordering::Relaxed);

    // Merge site UV (use max, since visitors may overlap)
    let source_uv = STORE
        .site_uv
        .get(source)
        .map(|v| v.load(Ordering::Relaxed))
        .unwrap_or(0);
    let target_uv = STORE
        .site_uv
        .entry(target.to_string())
        .or_insert_with(|| AtomicU64::new(0));
    let current_uv = target_uv.load(Ordering::Relaxed);
    if source_uv > current_uv {
        target_uv.store(source_uv, Ordering::Relaxed);
    }

    // Merge visitors
    if let Some(source_visitors) = STORE.site_visitors.get(source) {
        let target_visitors = STORE.site_visitors.entry(target.to_string()).or_default();
        for vh in source_visitors.iter() {
            target_visitors.insert(*vh);
        }
    }

    // Merge page stats
    let source_prefix = format!("{}:", source);
    let target_prefix = format!("{}:", target);
    let pages_to_merge: Vec<_> = STORE
        .page_pv
        .iter()
        .filter(|e| e.key().starts_with(&source_prefix))
        .map(|e| (e.key().clone(), e.value().load(Ordering::Relaxed)))
        .collect();

    let mut pages_merged = 0;
    for (source_page_key, source_page_pv) in pages_to_merge {
        let path = source_page_key.strip_prefix(&source_prefix).unwrap_or("");
        let target_page_key = format!("{}{}", target_prefix, path);

        // Add to existing or create new
        STORE
            .page_pv
            .entry(target_page_key)
            .or_insert_with(|| AtomicU64::new(0))
            .fetch_add(source_page_pv, Ordering::Relaxed);

        pages_merged += 1;
    }

    // Delete source site
    STORE.site_pv.remove(source);
    STORE.site_uv.remove(source);
    STORE.site_visitors.remove(source);
    STORE
        .page_pv
        .retain(|k, _| !k.starts_with(&source_prefix));

    Json(json!({
        "success": true,
        "message": format!("已将 {} 合并到 {}，共迁移 {} 个页面", source, target, pages_merged)
    }))
}
