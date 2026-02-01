//! Stats handler

use axum::response::{IntoResponse, Json};
use serde_json::json;
use std::sync::atomic::Ordering;

use crate::state::STORE;

/// GET /api/admin/stats
pub async fn stats_handler() -> impl IntoResponse {
    let total_sites = STORE.site_pv.len() as u64;
    let total_pages = STORE.page_pv.len() as u64;

    let mut total_site_pv: u64 = 0;
    let mut total_site_uv: u64 = 0;

    for entry in STORE.site_pv.iter() {
        total_site_pv += entry.value().load(Ordering::Relaxed);
    }
    for entry in STORE.site_uv.iter() {
        total_site_uv += entry.value().load(Ordering::Relaxed);
    }

    Json(json!({
        "success": true,
        "data": {
            "total_sites": total_sites,
            "total_pages": total_pages,
            "total_site_pv": total_site_pv,
            "total_site_uv": total_site_uv
        }
    }))
}
