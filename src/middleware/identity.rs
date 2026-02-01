//! Visitor identity middleware using Cookie (compatible with original busuanzi)

use axum::{
    body::Body,
    http::{header, Request, Response},
    middleware::Next,
};

const COOKIE_NAME: &str = "busuanziId";

pub async fn identity_middleware(mut req: Request<Body>, next: Next) -> Response<Body> {
    // Check existing busuanziId cookie
    let existing_id = req
        .headers()
        .get(header::COOKIE)
        .and_then(|h| h.to_str().ok())
        .and_then(|cookies| parse_cookie(cookies, COOKIE_NAME));

    let (user_identity, is_new) = if let Some(id) = existing_id {
        // Use existing cookie value directly (compatible with original busuanzi)
        (id, false)
    } else {
        // Generate new identity: MD5(IP + UserAgent), uppercase
        let ip = req
            .headers()
            .get("X-Forwarded-For")
            .or_else(|| req.headers().get("X-Real-IP"))
            .and_then(|h| h.to_str().ok())
            .and_then(|s| s.split(',').next()) // Take first IP if multiple
            .unwrap_or("127.0.0.1")
            .trim();

        let ua = req
            .headers()
            .get(header::USER_AGENT)
            .and_then(|h| h.to_str().ok())
            .unwrap_or("");

        let raw = format!("{}{}", ip, ua);
        let id = format!("{:X}", md5::compute(raw)); // Uppercase hex like original
        (id, true)
    };

    req.extensions_mut().insert(user_identity.clone());

    let mut response = next.run(req).await;

    // Set cookie if new visitor
    if is_new {
        // Set cookie with long expiry, SameSite=None for cross-site requests
        let cookie = format!(
            "{}={}; Path=/; Max-Age=31536000; SameSite=None; Secure",
            COOKIE_NAME, user_identity
        );
        if let Ok(value) = cookie.parse() {
            response.headers_mut().insert(header::SET_COOKIE, value);
        }
    }

    response
}

fn parse_cookie(cookies: &str, name: &str) -> Option<String> {
    for cookie in cookies.split(';') {
        let cookie = cookie.trim();
        if let Some(value) = cookie.strip_prefix(name) {
            if let Some(value) = value.strip_prefix('=') {
                return Some(value.to_string());
            }
        }
    }
    None
}
