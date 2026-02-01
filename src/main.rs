mod api;
mod config;
mod core;
mod middleware;
mod state;
mod static_files;

use axum::{
    middleware as axum_middleware,
    routing::{delete, get, post, put},
    Router,
};
use std::net::SocketAddr;
use std::time::Duration;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

use crate::config::CONFIG;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    // Load persisted data
    if let Err(e) = state::load() {
        tracing::error!("Failed to load data: {}", e);
    }

    // Background persistence task
    tokio::spawn(async {
        let interval = Duration::from_secs(CONFIG.save_interval);
        loop {
            tokio::time::sleep(interval).await;
            if let Err(e) = state::save().await {
                tracing::error!("Failed to save data: {}", e);
            }
        }
    });

    // Graceful shutdown - save on exit
    let shutdown = async {
        tokio::signal::ctrl_c().await.ok();
        tracing::info!("Shutting down, saving data...");
        if let Err(e) = state::save().await {
            tracing::error!("Failed to save on shutdown: {}", e);
        }
    };

    // CORS
    let cors_layer = if CONFIG.cors == "*" {
        CorsLayer::new()
            .allow_origin(Any)
            .allow_methods(Any)
            .allow_headers(Any)
            .expose_headers(Any)
    } else {
        let origins: Vec<_> = CONFIG
            .cors
            .split(',')
            .filter_map(|s| s.trim().parse().ok())
            .collect();
        CorsLayer::new()
            .allow_origin(origins)
            .allow_methods(Any)
            .allow_headers(Any)
            .expose_headers(Any)
    };

    // Admin routes (protected)
    let admin_routes = Router::new()
        .route("/keys", get(api::admin::list_keys_handler))
        .route("/keys", delete(api::admin::delete_key_handler))
        .route("/keys/update", post(api::admin::update_key_handler))
        .route("/pages", get(api::admin::list_pages_handler))
        .route("/pages/update", post(api::admin::update_page_handler))
        .route("/stats", get(api::admin::stats_handler))
        .route("/export", get(api::admin::export_handler))
        .route("/import", post(api::admin::import_handler))
        .route("/sync", get(api::admin::sync_handler))
        .route("/sync/upload", post(api::admin::sync_upload_handler))
        .layer(axum_middleware::from_fn(
            middleware::admin_auth::admin_auth_middleware,
        ));

    let app = Router::new()
        // Main API
        .route("/api", post(api::handlers::api_handler))
        .route("/api", get(api::handlers::get_handler))
        .route("/api", put(api::handlers::put_handler))
        // Health check
        .route("/ping", get(api::handlers::ping_handler))
        // Admin API
        .nest("/api/admin", admin_routes)
        // Static files
        .route("/", get(static_files::serve_index))
        .route("/admin", get(static_files::serve_admin))
        .route("/static/*path", get(static_files::serve_static))
        // Middleware
        .layer(axum_middleware::from_fn(
            middleware::identity::identity_middleware,
        ))
        .layer(cors_layer)
        .layer(TraceLayer::new_for_http());

    let addr: SocketAddr = CONFIG.web_addr.parse().expect("Invalid address");
    tracing::info!("Busuanzi listening on {}", addr);
    tracing::info!("Admin panel: http://{}/admin", addr);
    tracing::info!("Admin API protected: {}", !CONFIG.admin_token.is_empty());
    tracing::info!("Data saves every {}s", CONFIG.save_interval);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown)
        .await
        .unwrap();
}
