use crate::config::CONFIG;
use axum::{
    body::Body,
    http::{Request, Response, StatusCode},
    middleware::Next,
    response::IntoResponse,
};

pub async fn admin_auth_middleware(req: Request<Body>, next: Next) -> Response<Body> {
    // If ADMIN_TOKEN is not set, allow access (for development)
    if CONFIG.admin_token.is_empty() {
        tracing::warn!("ADMIN_TOKEN is not set! Admin API is unprotected.");
        return next.run(req).await;
    }

    // Check Authorization header: Bearer <token>
    let auth_header = req
        .headers()
        .get("Authorization")
        .and_then(|h| h.to_str().ok());

    // Check Authorization header first
    let mut is_authorized = match auth_header {
        Some(header) => {
            if let Some(token) = header.strip_prefix("Bearer ") {
                token == CONFIG.admin_token
            } else {
                header == CONFIG.admin_token
            }
        }
        None => {
            // Also check X-Admin-Token header
            req.headers()
                .get("X-Admin-Token")
                .and_then(|h| h.to_str().ok())
                .map(|t| t == CONFIG.admin_token)
                .unwrap_or(false)
        }
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
        next.run(req).await
    } else {
        (
            StatusCode::UNAUTHORIZED,
            [("Content-Type", "application/json")],
            r#"{"success":false,"message":"unauthorized"}"#,
        )
            .into_response()
    }
}
