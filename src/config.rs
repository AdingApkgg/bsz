//! Configuration

use once_cell::sync::Lazy;
use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub web_addr: String,
    pub cors: String,
    pub bsz_secret: String,
    pub bsz_encrypt: String,
    pub bsz_path_style: bool,
    pub admin_token: String,
    pub save_interval: u64, // seconds
}

pub static CONFIG: Lazy<Config> = Lazy::new(|| {
    dotenv::dotenv().ok();

    Config {
        web_addr: env::var("WEB_ADDRESS").unwrap_or_else(|_| "0.0.0.0:8080".to_string()),
        cors: env::var("WEB_CORS").unwrap_or_else(|_| "*".to_string()),
        bsz_secret: env::var("BSZ_SECRET").unwrap_or_else(|_| "bsz".to_string()),
        bsz_encrypt: env::var("BSZ_ENCRYPT").unwrap_or_else(|_| "MD516".to_string()),
        bsz_path_style: env::var("BSZ_PATH_STYLE")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(true),
        admin_token: env::var("ADMIN_TOKEN").unwrap_or_default(),
        save_interval: env::var("SAVE_INTERVAL")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(30),
    }
});
