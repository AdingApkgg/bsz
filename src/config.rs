//! Configuration

use once_cell::sync::Lazy;
use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub web_addr: String,
    pub domain: String,
    pub admin_token: String,
    pub save_interval: u64,    // seconds
    pub max_body_size: usize,  // bytes, for file upload (import/sync)
}

pub static CONFIG: Lazy<Config> = Lazy::new(|| {
    dotenv::dotenv().ok();

    let port = env::var("PORT").unwrap_or_else(|_| "8080".to_string());

    Config {
        web_addr: format!("0.0.0.0:{}", port),
        domain: env::var("DOMAIN").unwrap_or_else(|_| format!("localhost:{}", port)),
        admin_token: env::var("ADMIN_TOKEN").unwrap_or_default(),
        save_interval: env::var("SAVE_INTERVAL")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(30),
        max_body_size: env::var("MAX_BODY_SIZE")
            .ok()
            .and_then(|v| parse_size(&v))
            .unwrap_or(100 * 1024 * 1024), // default 100MB
    }
});

/// Parse human-readable size string, e.g. "100MB", "1GB", "512KB", or plain bytes "10485760"
fn parse_size(s: &str) -> Option<usize> {
    let s = s.trim().to_uppercase();
    if let Ok(n) = s.parse::<usize>() {
        return Some(n);
    }
    let (num, multiplier) = if let Some(n) = s.strip_suffix("GB") {
        (n.trim(), 1024 * 1024 * 1024)
    } else if let Some(n) = s.strip_suffix("MB") {
        (n.trim(), 1024 * 1024)
    } else if let Some(n) = s.strip_suffix("KB") {
        (n.trim(), 1024)
    } else if let Some(n) = s.strip_suffix('B') {
        (n.trim(), 1)
    } else {
        return None;
    };
    num.parse::<usize>().ok().map(|n| n * multiplier)
}
