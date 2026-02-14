use crate::config::CONFIG;
use axum::{
    body::Body,
    http::{Request, Response, StatusCode},
    middleware::Next,
    response::IntoResponse,
};
use dashmap::DashMap;
use once_cell::sync::Lazy;
use std::time::Instant;

/// Track failed login attempts per IP: (fail_count, last_fail_time)
static FAIL_MAP: Lazy<DashMap<String, (u32, Instant)>> = Lazy::new(DashMap::new);

const MAX_FAILS: u32 = 5;
const LOCKOUT_SECS: u64 = 300; // 5 minutes

fn get_client_ip(req: &Request<Body>) -> String {
    req.headers()
        .get("X-Forwarded-For")
        .or_else(|| req.headers().get("X-Real-IP"))
        .and_then(|h| h.to_str().ok())
        .and_then(|s| s.split(',').next())
        .unwrap_or("unknown")
        .trim()
        .to_string()
}

pub async fn admin_auth_middleware(req: Request<Body>, next: Next) -> Response<Body> {
    // If ADMIN_TOKEN is not set, allow access (for development)
    if CONFIG.admin_token.is_empty() {
        tracing::warn!("ADMIN_TOKEN is not set! Admin API is unprotected.");
        return next.run(req).await;
    }

    let ip = get_client_ip(&req);

    // Check if IP is locked out
    if let Some(entry) = FAIL_MAP.get(&ip) {
        let (count, last_time) = entry.value();
        if *count >= MAX_FAILS && last_time.elapsed().as_secs() < LOCKOUT_SECS {
            let remaining = LOCKOUT_SECS - last_time.elapsed().as_secs();
            return (
                StatusCode::TOO_MANY_REQUESTS,
                [("Content-Type", "application/json")],
                format!(
                    r#"{{"success":false,"message":"登录失败次数过多，请 {} 秒后重试"}}"#,
                    remaining
                ),
            )
                .into_response();
        }
    }

    // Check Authorization header: Bearer <token>
    let auth_header = req
        .headers()
        .get("Authorization")
        .and_then(|h| h.to_str().ok());

    let mut is_authorized = match auth_header {
        Some(header) => {
            if let Some(token) = header.strip_prefix("Bearer ") {
                token == CONFIG.admin_token
            } else {
                header == CONFIG.admin_token
            }
        }
        None => req
            .headers()
            .get("X-Admin-Token")
            .and_then(|h| h.to_str().ok())
            .map(|t| t == CONFIG.admin_token)
            .unwrap_or(false),
    };

    // Also check token in query string (for SSE which doesn't support headers)
    if !is_authorized {
        if let Some(query) = req.uri().query() {
            for pair in query.split('&') {
                if let Some(token) = pair.strip_prefix("token=") {
                    let decoded = urlencoding::decode(token).unwrap_or_default();
                    if decoded == CONFIG.admin_token {
                        is_authorized = true;
                        break;
                    }
                }
            }
        }
    }

    if is_authorized {
        // Clear fail count on success
        FAIL_MAP.remove(&ip);
        next.run(req).await
    } else {
        // Record failure
        let mut entry = FAIL_MAP.entry(ip.clone()).or_insert((0, Instant::now()));
        let (count, last_time) = entry.value_mut();
        // Reset if lockout expired
        if last_time.elapsed().as_secs() >= LOCKOUT_SECS {
            *count = 0;
        }
        *count += 1;
        *last_time = Instant::now();

        (
            StatusCode::UNAUTHORIZED,
            [("Content-Type", "application/json")],
            r#"{"success":false,"message":"unauthorized"}"#,
        )
            .into_response()
    }
}
