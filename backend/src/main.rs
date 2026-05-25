mod api;
mod config;
mod core;
mod middleware;
mod state;

use axum::extract::DefaultBodyLimit;
use axum::http::{header, HeaderName, Method};
use axum::{
    middleware as axum_middleware,
    routing::{delete, get, post, put},
    Json, Router,
};
use serde_json::json;
use std::net::SocketAddr;
use std::time::Duration;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;

use crate::config::CONFIG;

fn admin_routes() -> Router {
    Router::new()
        .route("/keys", get(api::admin::list_keys_handler))
        .route("/keys", delete(api::admin::delete_key_handler))
        .route("/keys/update", post(api::admin::update_key_handler))
        .route("/keys/rename", post(api::admin::rename_key_handler))
        .route("/keys/merge", post(api::admin::merge_key_handler))
        .route(
            "/keys/batch-delete",
            post(api::admin::batch_delete_keys_handler),
        )
        .route("/pages", get(api::admin::list_pages_handler))
        .route("/pages/update", post(api::admin::update_page_handler))
        .route(
            "/pages/batch-delete",
            post(api::admin::batch_delete_pages_handler),
        )
        .route("/stats", get(api::admin::stats_handler))
        .route("/logs", get(api::admin::logs_handler))
        .route("/export", get(api::admin::export_handler))
        .route("/import", post(api::admin::import_handler))
        .route("/sync", get(api::admin::sync_handler))
        .route("/sync/upload", post(api::admin::sync_upload_handler))
        .layer(DefaultBodyLimit::max(CONFIG.max_body_size))
        .layer(axum_middleware::from_fn(
            middleware::admin_auth::admin_auth_middleware,
        ))
}

async fn root() -> Json<serde_json::Value> {
    Json(json!({
        "name": env!("CARGO_PKG_NAME"),
        "version": env!("CARGO_PKG_VERSION"),
        "admin_enabled": !CONFIG.admin_token.is_empty(),
    }))
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    if let Err(e) = state::load() {
        tracing::error!("Failed to load data: {}", e);
    }

    tokio::spawn(async {
        let interval = Duration::from_secs(CONFIG.save_interval);
        loop {
            tokio::time::sleep(interval).await;
            if let Err(e) = state::save().await {
                tracing::error!("Failed to save data: {}", e);
            }
        }
    });

    let shutdown = async {
        tokio::signal::ctrl_c().await.ok();
        tracing::info!("Shutting down, saving data...");
        if let Err(e) = state::save().await {
            tracing::error!("Failed to save on shutdown: {}", e);
        }
    };

    // CORS — frontend may be hosted on a different origin (GitHub Pages, Cloudflare Pages, ...).
    let cors_layer = CorsLayer::new()
        .allow_origin(tower_http::cors::AllowOrigin::mirror_request())
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers([
            header::CONTENT_TYPE,
            header::AUTHORIZATION,
            HeaderName::from_static("x-admin-token"),
            HeaderName::from_static("x-bsz-referer"),
        ])
        .allow_credentials(true)
        .expose_headers([header::SET_COOKIE]);

    let mut app = Router::new()
        .route("/", get(root))
        .route("/api", post(api::handlers::api_handler))
        .route("/api", get(api::handlers::get_handler))
        .route("/api", put(api::handlers::put_handler))
        .route("/ping", get(api::handlers::ping_handler));

    // Admin API is mounted only when ADMIN_TOKEN is configured.
    // Empty token means the operator does not want a remotely-reachable control plane.
    if !CONFIG.admin_token.is_empty() {
        app = app.nest("/api/admin", admin_routes());
    }

    let app = app
        .layer(axum_middleware::from_fn(
            middleware::identity::identity_middleware,
        ))
        .layer(cors_layer)
        .layer(TraceLayer::new_for_http());

    let addr: SocketAddr = CONFIG.web_addr.parse().expect("Invalid address");
    tracing::info!("Busuanzi listening on {}", addr);
    if CONFIG.admin_token.is_empty() {
        tracing::info!("Admin API disabled (set ADMIN_TOKEN to enable)");
    } else {
        tracing::info!("Admin API mounted at /api/admin/*");
    }
    tracing::info!("Data saves every {}s", CONFIG.save_interval);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown)
        .await
        .unwrap();
}
