//! Static files with external override support
//!
//! Priority: ./static/{file} > embedded default

use axum::{
    extract::Path,
    http::{header, StatusCode},
    response::Response,
};
use rust_embed::RustEmbed;
use std::path::PathBuf;

use crate::config::CONFIG;

#[derive(RustEmbed)]
#[folder = "static/"]
struct Assets;

const STATIC_DIR: &str = "static";

fn mime_type(path: &str) -> String {
    let mime = mime_guess::from_path(path)
        .first_raw()
        .unwrap_or("application/octet-stream");

    // Add charset=utf-8 for text types
    if mime.starts_with("text/")
        || mime.contains("json")
        || mime.contains("xml")
        || mime.contains("javascript")
    {
        format!("{}; charset=utf-8", mime)
    } else {
        mime.to_string()
    }
}

/// Try to read from external static dir first, fallback to embedded
fn read_file(path: &str) -> Option<Vec<u8>> {
    // Try external file first
    let external_path = PathBuf::from(STATIC_DIR).join(path);
    if external_path.exists() {
        if let Ok(content) = std::fs::read(&external_path) {
            tracing::debug!("Serving external: {}", external_path.display());
            return Some(content);
        }
    }

    // Fallback to embedded
    Assets::get(path).map(|f| f.data.to_vec())
}

fn serve(path: &str) -> Response {
    match read_file(path) {
        Some(content) => Response::builder()
            .status(StatusCode::OK)
            .header(header::CONTENT_TYPE, mime_type(path))
            .header(header::CACHE_CONTROL, "public, max-age=86400")
            .body(content.into())
            .unwrap(),
        None => Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body("Not Found".into())
            .unwrap(),
    }
}

/// Serve file with dynamic {{HOST}} replacement from config
fn serve_dynamic(path: &str) -> Response {
    match read_file(path) {
        Some(content) => {
            let text = String::from_utf8_lossy(&content);
            let replaced = text.replace("{{HOST}}", &CONFIG.domain);

            Response::builder()
                .status(StatusCode::OK)
                .header(header::CONTENT_TYPE, mime_type(path))
                .header(header::CACHE_CONTROL, "public, max-age=3600")
                .body(replaced.into())
                .unwrap()
        }
        None => Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body("Not Found".into())
            .unwrap(),
    }
}

pub async fn serve_index() -> Response {
    serve_dynamic("index.html")
}

pub async fn serve_admin() -> Response {
    serve("admin.html")
}

pub async fn serve_robots() -> Response {
    serve_dynamic("robots.txt")
}

pub async fn serve_llms() -> Response {
    serve_dynamic("llms.txt")
}

pub async fn serve_sitemap() -> Response {
    serve_dynamic("sitemap.xml")
}

pub async fn serve_static(Path(path): Path<String>) -> Response {
    serve(&path)
}
