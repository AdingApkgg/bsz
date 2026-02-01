//! Embedded static files using rust-embed

use axum::{
    extract::Path,
    http::{header, StatusCode},
    response::Response,
};
use rust_embed::RustEmbed;

#[derive(RustEmbed)]
#[folder = "static/"]
struct Assets;

fn mime_type(path: &str) -> &'static str {
    mime_guess::from_path(path)
        .first_raw()
        .unwrap_or("application/octet-stream")
}

fn serve(path: &str) -> Response {
    match Assets::get(path) {
        Some(content) => Response::builder()
            .status(StatusCode::OK)
            .header(header::CONTENT_TYPE, mime_type(path))
            .header(header::CACHE_CONTROL, "public, max-age=86400")
            .body(content.data.into())
            .unwrap(),
        None => Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body("Not Found".into())
            .unwrap(),
    }
}

pub async fn serve_index() -> Response {
    serve("index.html")
}

pub async fn serve_admin() -> Response {
    serve("admin.html")
}

pub async fn serve_static(Path(path): Path<String>) -> Response {
    serve(&path)
}
