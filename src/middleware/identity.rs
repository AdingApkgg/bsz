use axum::{
    body::Body,
    http::{Request, Response},
    middleware::Next,
};
use sha1::{Sha1, Digest};
use crate::config::CONFIG;

pub async fn identity_middleware(
    mut req: Request<Body>,
    next: Next,
) -> Response<Body> {
    // Check Authorization
    let token = req.headers().get("Authorization")
        .and_then(|h| h.to_str().ok())
        .map(|s| s.replace("Bearer ", ""));
    
    let mut user_identity = String::new();
    let mut new_token = String::new();

    if let Some(t) = token {
        if let Some(uid) = check_token(&t) {
            user_identity = uid;
        }
    }

    if user_identity.is_empty() {
        // Generate new identity
        // Original: Md5(ClientIP + UserAgent)
        let ip = req.headers().get("X-Forwarded-For")
            .or_else(|| req.headers().get("X-Real-IP"))
            .and_then(|h| h.to_str().ok())
            .unwrap_or("127.0.0.1"); // Fallback
            
        let ua = req.headers().get("User-Agent")
            .and_then(|h| h.to_str().ok())
            .unwrap_or("");
            
        let raw = format!("{}{}", ip, ua);
        user_identity = format!("{:x}", md5::compute(raw));
        new_token = generate_token(&user_identity);
    }

    req.extensions_mut().insert(user_identity.clone());

    let mut response = next.run(req).await;

    // Expose Headers
    response.headers_mut().insert("Access-Control-Expose-Headers", "Set-Bsz-Identity".parse().unwrap());
    
    if !new_token.is_empty() {
         response.headers_mut().insert("Set-Bsz-Identity", new_token.parse().unwrap());
    }

    response
}

fn generate_token(identity: &str) -> String {
    let secret = &CONFIG.bsz_secret;
    let mut hasher = Sha1::new();
    hasher.update(identity.as_bytes());
    hasher.update(secret.as_bytes());
    let sign = hex::encode(hasher.finalize());
    format!("{}.{}", identity, sign)
}

fn check_token(token: &str) -> Option<String> {
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 2 {
        return None;
    }
    let identity = parts[0];
    let sign = parts[1];
    
    let secret = &CONFIG.bsz_secret;
    let mut hasher = Sha1::new();
    hasher.update(identity.as_bytes());
    hasher.update(secret.as_bytes());
    let calculated_sign = hex::encode(hasher.finalize());
    
    if sign == calculated_sign {
        Some(identity.to_string())
    } else {
        None
    }
}
