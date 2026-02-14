//! Page management handlers

use axum::extract::Query;
use axum::http::HeaderMap;
use axum::response::{IntoResponse, Json};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::atomic::{AtomicU64, Ordering};

use crate::state::{self, STORE};

fn client_ip(headers: &HeaderMap) -> String {
    headers
        .get("X-Forwarded-For")
        .or_else(|| headers.get("X-Real-IP"))
        .and_then(|h| h.to_str().ok())
        .and_then(|s| s.split(',').next())
        .unwrap_or("unknown")
        .trim()
        .to_string()
}

#[derive(Debug, Deserialize)]
pub struct ListPagesParams {
    pub site_key: String,
    pub cursor: Option<usize>,
    pub count: Option<usize>,
}

#[derive(Debug, Serialize)]
pub struct PageInfo {
    pub page_key: String,
    pub path: String,
    pub pv: u64,
}

/// GET /api/admin/pages?site_key=xxx&cursor=0&count=20
pub async fn list_pages_handler(Query(params): Query<ListPagesParams>) -> impl IntoResponse {
    let prefix = format!("{}:", params.site_key);
    let cursor = params.cursor.unwrap_or(0);
    let count = params.count.unwrap_or(50);

    let mut all_pages: Vec<PageInfo> = Vec::new();

    for entry in STORE.page_pv.iter() {
        let key = entry.key();
        if key.starts_with(&prefix) {
            let pv = entry.value().load(Ordering::Relaxed);
            let path = key.strip_prefix(&prefix).unwrap_or(key).to_string();

            all_pages.push(PageInfo {
                page_key: key.clone(),
                path,
                pv,
            });
        }
    }

    // Sort by PV descending
    all_pages.sort_by(|a, b| b.pv.cmp(&a.pv));

    let total = all_pages.len();
    let pages: Vec<PageInfo> = all_pages.into_iter().skip(cursor).take(count).collect();

    let next_cursor = if pages.len() == count {
        cursor + count
    } else {
        0
    };

    Json(json!({
        "success": true,
        "data": pages,
        "total": total,
        "next_cursor": next_cursor
    }))
}

#[derive(Debug, Deserialize)]
pub struct UpdatePageParams {
    pub page_key: String,
    pub pv: Option<u64>,
}

/// POST /api/admin/pages/update
pub async fn update_page_handler(
    headers: HeaderMap,
    Json(params): Json<UpdatePageParams>,
) -> impl IntoResponse {
    let ip = client_ip(&headers);
    let key = &params.page_key;

    if let Some(pv) = params.pv {
        STORE
            .page_pv
            .entry(key.to_string())
            .or_insert_with(|| AtomicU64::new(0))
            .store(pv, Ordering::Relaxed);
    }

    state::add_log("edit_page", &format!("{} pv = {:?}", key, params.pv), &ip);

    Json(json!({
        "success": true,
        "message": "updated"
    }))
}

#[derive(Debug, Deserialize)]
pub struct BatchDeletePagesParams {
    pub page_keys: Vec<String>,
}

/// POST /api/admin/pages/batch-delete
pub async fn batch_delete_pages_handler(
    headers: HeaderMap,
    Json(params): Json<BatchDeletePagesParams>,
) -> impl IntoResponse {
    let ip = client_ip(&headers);
    let mut deleted = 0usize;

    for key in &params.page_keys {
        if STORE.page_pv.remove(key).is_some() {
            deleted += 1;
        }
    }

    state::add_log(
        "batch_delete_pages",
        &format!("{} pages deleted", deleted),
        &ip,
    );

    Json(json!({
        "success": true,
        "message": format!("批量删除 {} 个页面", deleted),
        "deleted": deleted
    }))
}
