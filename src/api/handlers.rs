//! API handlers

use crate::core::count;
use axum::{
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Json},
    Extension,
};
use serde_json::json;
use url::Url;

fn default_data() -> serde_json::Value {
    json!({
        "project": "https://github.com/AdingApkgg/bsz",
    })
}

fn parse_referer(headers: &HeaderMap, header_name: &str) -> Result<(String, String), &'static str> {
    let referer = headers
        .get(header_name)
        .and_then(|h| h.to_str().ok())
        .unwrap_or("");

    if referer.is_empty() {
        return Err("invalid referer");
    }

    let u = Url::parse(referer).map_err(|_| "unable to parse referer")?;
    let host = u.host_str().ok_or("invalid referer")?.to_string();

    if host.is_empty() {
        return Err("invalid referer");
    }

    Ok((host, u.path().to_string()))
}

pub async fn ping_handler() -> impl IntoResponse {
    "pong"
}

/// POST /api - Count and return PV/UV
pub async fn api_handler(
    headers: HeaderMap,
    Extension(user_identity): Extension<String>,
) -> impl IntoResponse {
    let (host, path) = match parse_referer(&headers, "x-bsz-referer") {
        Ok(v) => v,
        Err(msg) => {
            return Json(json!({
                "success": false,
                "message": msg,
                "data": default_data()
            }))
        }
    };

    let counts = count::count(&host, &path, &user_identity);
    Json(json!({
        "success": true,
        "message": "ok",
        "data": counts
    }))
}

/// GET /api - Get counts without incrementing
pub async fn get_handler(headers: HeaderMap) -> impl IntoResponse {
    let (host, path) = match parse_referer(&headers, "x-bsz-referer") {
        Ok(v) => v,
        Err(msg) => {
            return Json(json!({
                "success": false,
                "message": msg,
                "data": default_data()
            }))
        }
    };

    let counts = count::get(&host, &path);
    Json(json!({
        "success": true,
        "message": "ok",
        "data": counts
    }))
}

/// PUT /api - Submit data without returning
pub async fn put_handler(
    headers: HeaderMap,
    Extension(user_identity): Extension<String>,
) -> impl IntoResponse {
    let (host, path) = match parse_referer(&headers, "x-bsz-referer") {
        Ok(v) => v,
        Err(_) => return StatusCode::BAD_REQUEST,
    };

    count::put(&host, &path, &user_identity);
    StatusCode::NO_CONTENT
}
