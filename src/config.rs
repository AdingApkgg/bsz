//! Configuration

use once_cell::sync::Lazy;
use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub web_addr: String,
    pub domain: String,
    pub admin_token: String,
    pub save_interval: u64, // seconds
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
    }
});
