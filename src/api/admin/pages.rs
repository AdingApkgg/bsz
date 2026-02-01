//! Page management handlers

use axum::extract::Query;
use axum::response::{IntoResponse, Json};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::atomic::{AtomicU64, Ordering};

use crate::state::STORE;

#[derive(Debug, Deserialize)]
pub struct ListPagesParams {
    pub site_hash: String,
}

#[derive(Debug, Serialize)]
pub struct PageInfo {
    pub page_key: String,
    pub page_hash: String,
    pub path: Option<String>,
    pub pv: u64,
}

/// GET /api/admin/pages?site_hash=xxx
pub async fn list_pages_handler(Query(params): Query<ListPagesParams>) -> impl IntoResponse {
    let prefix = format!("{}:", params.site_hash);
    let mut pages: Vec<PageInfo> = Vec::new();

    for entry in STORE.page_pv.iter() {
        let key = entry.key();
        if key.starts_with(&prefix) {
            let pv = entry.value().load(Ordering::Relaxed);
            let page_hash = key.strip_prefix(&prefix).unwrap_or(key).to_string();
            let path = STORE.page_paths.get(key).map(|v| v.clone());

            pages.push(PageInfo {
                page_key: key.clone(),
                page_hash,
                path,
                pv,
            });
        }
    }

    // Sort by PV descending
    pages.sort_by(|a, b| b.pv.cmp(&a.pv));

    Json(json!({
        "success": true,
        "data": pages
    }))
}

#[derive(Debug, Deserialize)]
pub struct UpdatePageParams {
    pub page_key: String,
    pub pv: Option<u64>,
}

/// POST /api/admin/pages/update
pub async fn update_page_handler(Json(params): Json<UpdatePageParams>) -> impl IntoResponse {
    let key = &params.page_key;

    if let Some(pv) = params.pv {
        STORE
            .page_pv
            .entry(key.to_string())
            .or_insert_with(|| AtomicU64::new(0))
            .store(pv, Ordering::Relaxed);
    }

    Json(json!({
        "success": true,
        "message": "updated"
    }))
}
