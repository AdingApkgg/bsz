//! Import/Export handlers for data.db

use axum::body::Body;
use axum::extract::Multipart;
use axum::http::{header, HeaderMap};
use axum::response::{IntoResponse, Json, Response};
use serde_json::json;

use crate::state;

fn client_ip(headers: &HeaderMap) -> String {
    headers
        .get("X-Forwarded-For")
        .or_else(|| headers.get("X-Real-IP"))
        .and_then(|h| h.to_str().ok())
        .and_then(|s| s.split(',').next())
        .unwrap_or("unknown")
        .trim()
        .to_string()
}

const DB_FILE: &str = "data.db";

/// GET /api/admin/export - Download data.db file
pub async fn export_handler(headers: HeaderMap) -> impl IntoResponse {
    let ip = client_ip(&headers);

    // Save current data first, then read file — all synchronous to avoid races
    let result = tokio::task::spawn_blocking(|| -> Result<Vec<u8>, String> {
        state::save_blocking().map_err(|e| format!("保存失败: {}", e))?;
        std::fs::read(DB_FILE).map_err(|e| format!("读取失败: {}", e))
    })
    .await;

    match result {
        Ok(Ok(data)) => {
            state::add_log("export", "导出数据库", &ip);
            Response::builder()
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
                .unwrap()
        }
        Ok(Err(msg)) => Response::builder()
            .status(500)
            .header(header::CONTENT_TYPE, "application/json")
            .body(Body::from(
                json!({"success": false, "message": msg}).to_string(),
            ))
            .unwrap(),
        Err(e) => Response::builder()
            .status(500)
            .header(header::CONTENT_TYPE, "application/json")
            .body(Body::from(
                json!({"success": false, "message": format!("内部错误: {}", e)}).to_string(),
            ))
            .unwrap(),
    }
}

/// POST /api/admin/import - Upload and replace data.db file
pub async fn import_handler(headers: HeaderMap, mut multipart: Multipart) -> impl IntoResponse {
    let ip = client_ip(&headers);

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

    // Write to temp file
    let temp_file = "data.db.import";
    if let Err(e) = tokio::fs::write(temp_file, &data).await {
        return Json(json!({
            "success": false,
            "message": format!("写入临时文件失败: {}", e)
        }));
    }

    // Atomically import: load into STORE + persist to main DB (holds DB lock)
    let result = tokio::task::spawn_blocking(move || state::import_from_file(temp_file)).await;

    // Clean up temp file
    let _ = tokio::fs::remove_file(temp_file).await;

    match result {
        Ok(Ok((sites, pages, visitors))) => {
            state::add_log(
                "import",
                &format!("{} sites, {} pages, {} visitors", sites, pages, visitors),
                &ip,
            );

            Json(json!({
                "success": true,
                "message": format!("导入成功: {} 站点, {} 页面, {} 访客", sites, pages, visitors),
                "data": {
                    "sites": sites,
                    "pages": pages,
                    "visitors": visitors
                }
            }))
        }
        Ok(Err(e)) => Json(json!({
            "success": false,
            "message": format!("导入失败: {}", e)
        })),
        Err(e) => Json(json!({
            "success": false,
            "message": format!("内部错误: {}", e)
        })),
    }
}
