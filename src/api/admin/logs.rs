//! Operation logs handler

use axum::extract::Query;
use axum::response::{IntoResponse, Json};
use serde::Deserialize;
use serde_json::json;

use crate::state;

#[derive(Debug, Deserialize)]
pub struct LogsParams {
    pub page: Option<usize>,
    pub size: Option<usize>,
}

/// GET /api/admin/logs?page=1&size=20
pub async fn logs_handler(Query(params): Query<LogsParams>) -> impl IntoResponse {
    let page = params.page.unwrap_or(1);
    let size = params.size.unwrap_or(20);

    match state::query_logs(page, size) {
        Ok((rows, total)) => {
            let logs: Vec<_> = rows
                .into_iter()
                .map(|(id, timestamp, action, detail, ip)| {
                    json!({
                        "id": id,
                        "timestamp": timestamp,
                        "action": action,
                        "detail": detail,
                        "ip": ip
                    })
                })
                .collect();

            Json(json!({
                "success": true,
                "data": logs,
                "total": total,
                "page": page,
                "size": size
            }))
        }
        Err(e) => Json(json!({
            "success": false,
            "message": format!("查询日志失败: {}", e)
        })),
    }
}
