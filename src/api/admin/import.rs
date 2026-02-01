//! Import/Export handlers for data.db

use axum::body::Body;
use axum::extract::Multipart;
use axum::http::header;
use axum::response::{IntoResponse, Json, Response};
use dashmap::DashSet;
use rusqlite::Connection;
use serde_json::json;
use std::sync::atomic::AtomicU64;

use crate::state::{self, STORE};

const DB_FILE: &str = "data.db";

/// GET /api/admin/export - Download data.db file
pub async fn export_handler() -> impl IntoResponse {
    // Save current data first
    if let Err(e) = state::save().await {
        return Response::builder()
            .status(500)
            .header(header::CONTENT_TYPE, "application/json")
            .body(Body::from(
                json!({"success": false, "message": format!("保存失败: {}", e)}).to_string(),
            ))
            .unwrap();
    }

    // Read database file
    match tokio::fs::read(DB_FILE).await {
        Ok(data) => Response::builder()
            .status(200)
            .header(header::CONTENT_TYPE, "application/x-sqlite3")
            .header(
                header::CONTENT_DISPOSITION,
                format!(
                    "attachment; filename=\"busuanzi-{}.db\"",
                    chrono::Local::now().format("%Y%m%d-%H%M%S")
                ),
            )
            .body(Body::from(data))
            .unwrap(),
        Err(e) => Response::builder()
            .status(500)
            .header(header::CONTENT_TYPE, "application/json")
            .body(Body::from(
                json!({"success": false, "message": format!("读取失败: {}", e)}).to_string(),
            ))
            .unwrap(),
    }
}

/// POST /api/admin/import - Upload and replace data.db file
pub async fn import_handler(mut multipart: Multipart) -> impl IntoResponse {
    // Get uploaded file
    let mut db_data: Option<Vec<u8>> = None;

    while let Some(field) = multipart.next_field().await.unwrap_or(None) {
        if field.name() == Some("file") {
            match field.bytes().await {
                Ok(bytes) => {
                    db_data = Some(bytes.to_vec());
                    break;
                }
                Err(e) => {
                    return Json(json!({
                        "success": false,
                        "message": format!("读取文件失败: {}", e)
                    }));
                }
            }
        }
    }

    let data = match db_data {
        Some(d) if !d.is_empty() => d,
        _ => {
            return Json(json!({
                "success": false,
                "message": "请上传 data.db 文件"
            }));
        }
    };

    // Validate it's a valid SQLite database
    if data.len() < 16 || &data[0..16] != b"SQLite format 3\0" {
        return Json(json!({
            "success": false,
            "message": "无效的 SQLite 数据库文件"
        }));
    }

    // Write to temp file first
    let temp_file = "data.db.import";
    if let Err(e) = tokio::fs::write(temp_file, &data).await {
        return Json(json!({
            "success": false,
            "message": format!("写入临时文件失败: {}", e)
        }));
    }

    // Load and validate the database
    let result = tokio::task::spawn_blocking(move || {
        let conn = Connection::open(temp_file)?;

        // Check tables exist
        let sites_count: i64 =
            conn.query_row("SELECT COUNT(*) FROM sites", [], |row| row.get(0))?;
        let pages_count: i64 =
            conn.query_row("SELECT COUNT(*) FROM pages", [], |row| row.get(0))?;

        // Clear current store
        STORE.site_pv.clear();
        STORE.site_uv.clear();
        STORE.site_visitors.clear();
        STORE.page_pv.clear();
        STORE.site_hosts.clear();
        STORE.page_paths.clear();

        // Load sites
        let mut stmt = conn.prepare("SELECT hash, pv, uv, host FROM sites")?;
        let rows = stmt.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, Option<String>>(3)?,
            ))
        })?;

        for row in rows {
            let (hash, pv, uv, host) = row?;
            STORE
                .site_pv
                .insert(hash.clone(), AtomicU64::new(pv as u64));
            STORE
                .site_uv
                .insert(hash.clone(), AtomicU64::new(uv as u64));
            STORE.site_visitors.insert(hash.clone(), DashSet::new());
            if let Some(h) = host {
                STORE.site_hosts.insert(hash, h);
            }
        }

        // Load pages
        let mut stmt = conn.prepare("SELECT key, pv, path FROM pages")?;
        let rows = stmt.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, Option<String>>(2)?,
            ))
        })?;

        for row in rows {
            let (key, pv, path) = row?;
            STORE.page_pv.insert(key.clone(), AtomicU64::new(pv as u64));
            if let Some(p) = path {
                STORE.page_paths.insert(key, p);
            }
        }

        Ok::<(i64, i64), rusqlite::Error>((sites_count, pages_count))
    })
    .await;

    // Clean up temp file
    let _ = tokio::fs::remove_file(temp_file).await;

    match result {
        Ok(Ok((sites, pages))) => {
            // Trigger save to update the main database
            tokio::spawn(async {
                if let Err(e) = state::save().await {
                    tracing::error!("Failed to save after import: {}", e);
                }
            });

            Json(json!({
                "success": true,
                "message": format!("导入成功: {} 站点, {} 页面", sites, pages),
                "data": {
                    "sites": sites,
                    "pages": pages
                }
            }))
        }
        Ok(Err(e)) => Json(json!({
            "success": false,
            "message": format!("数据库读取错误: {}", e)
        })),
        Err(e) => Json(json!({
            "success": false,
            "message": format!("导入失败: {}", e)
        })),
    }
}
