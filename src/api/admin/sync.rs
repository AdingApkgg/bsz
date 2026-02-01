//! Sitemap sync handler

use axum::extract::{Multipart, Query};
use axum::response::sse::{Event, KeepAlive, Sse};
use axum::response::{IntoResponse, Json};
use dashmap::DashMap;
use futures::stream::Stream;
use once_cell::sync::Lazy;
use serde::Deserialize;
use serde_json::json;
use std::convert::Infallible;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;

use crate::core::count::get_keys;
use crate::state::STORE;

// Temporary storage for uploaded sitemap URLs
static UPLOADED_SITEMAPS: Lazy<DashMap<String, Vec<String>>> = Lazy::new(DashMap::new);

enum SitemapSource {
    Remote(String),
    Uploaded(String),
    None,
}

#[derive(Debug, Deserialize)]
pub struct SitemapSyncParams {
    pub sitemap_url: Option<String>,
    pub sync_id: Option<String>,
    pub concurrency: Option<usize>,
}

/// POST /api/admin/sync/upload - Upload XML file and get sync_id
pub async fn sync_upload_handler(mut multipart: Multipart) -> impl IntoResponse {
    let mut xml_content: Option<String> = None;

    while let Some(field) = multipart.next_field().await.unwrap_or(None) {
        if field.name() == Some("file") {
            match field.text().await {
                Ok(text) => {
                    xml_content = Some(text);
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

    let xml = match xml_content {
        Some(x) if !x.is_empty() => x,
        _ => {
            return Json(json!({
                "success": false,
                "message": "请上传 XML 文件"
            }));
        }
    };

    // Parse sitemap
    let urls = match parse_sitemap(&xml) {
        Ok(urls) => urls,
        Err(e) => {
            return Json(json!({
                "success": false,
                "message": format!("XML 解析失败: {}", e)
            }));
        }
    };

    if urls.is_empty() {
        return Json(json!({
            "success": false,
            "message": "未找到有效的 URL"
        }));
    }

    // Generate sync_id and store URLs
    let sync_id = format!(
        "{:x}",
        md5::compute(format!("{}{:?}", chrono::Utc::now(), urls))
    );
    let url_count = urls.len();
    UPLOADED_SITEMAPS.insert(sync_id.clone(), urls);

    // Auto cleanup after 5 minutes
    let cleanup_id = sync_id.clone();
    tokio::spawn(async move {
        tokio::time::sleep(Duration::from_secs(300)).await;
        UPLOADED_SITEMAPS.remove(&cleanup_id);
    });

    Json(json!({
        "success": true,
        "sync_id": sync_id,
        "url_count": url_count
    }))
}

/// GET /api/admin/sync?sitemap_url=...&concurrency=3
/// GET /api/admin/sync?sync_id=...&concurrency=3
/// Sync data from sitemap + busuanzi.ibruce.info with SSE progress
pub async fn sync_handler(
    Query(params): Query<SitemapSyncParams>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let concurrency = params.concurrency.unwrap_or(3).clamp(1, 10);

    // Get URLs from either uploaded file or remote sitemap
    let urls_source = if let Some(sync_id) = params.sync_id {
        SitemapSource::Uploaded(sync_id)
    } else if let Some(url) = params.sitemap_url {
        SitemapSource::Remote(url)
    } else {
        SitemapSource::None
    };

    let stream = async_stream::stream! {
        let urls = match urls_source {
            SitemapSource::Uploaded(sync_id) => {
                yield Ok(Event::default().event("progress").data(
                    json!({"status": "parsing", "message": format!("使用上传的 sitemap (并发: {})...", concurrency)}).to_string()
                ));

                match UPLOADED_SITEMAPS.remove(&sync_id) {
                    Some((_, urls)) => urls,
                    None => {
                        yield Ok(Event::default().event("error").data(
                            json!({"message": "Sync ID 已过期或无效"}).to_string()
                        ));
                        return;
                    }
                }
            }
            SitemapSource::Remote(sitemap_url) => {
                yield Ok(Event::default().event("progress").data(
                    json!({"status": "fetching", "message": format!("正在获取 sitemap (并发: {})...", concurrency)}).to_string()
                ));

                let client = reqwest::Client::builder()
                    .timeout(Duration::from_secs(30))
                    .build()
                    .unwrap();

                let sitemap_text = match client.get(&sitemap_url).send().await {
                    Ok(res) => match res.text().await {
                        Ok(text) => text,
                        Err(e) => {
                            yield Ok(Event::default().event("error").data(
                                json!({"message": format!("Failed to read sitemap: {}", e)}).to_string()
                            ));
                            return;
                        }
                    },
                    Err(e) => {
                        yield Ok(Event::default().event("error").data(
                            json!({"message": format!("Failed to fetch sitemap: {}", e)}).to_string()
                        ));
                        return;
                    }
                };

                match parse_sitemap(&sitemap_text) {
                    Ok(urls) => urls,
                    Err(e) => {
                        yield Ok(Event::default().event("error").data(
                            json!({"message": format!("Failed to parse sitemap: {}", e)}).to_string()
                        ));
                        return;
                    }
                }
            }
            SitemapSource::None => {
                yield Ok(Event::default().event("error").data(
                    json!({"message": "请提供 sitemap_url 或 sync_id"}).to_string()
                ));
                return;
            }
        };

        if urls.is_empty() {
            yield Ok(Event::default().event("error").data(
                json!({"message": "No URLs found in sitemap"}).to_string()
            ));
            return;
        }

        let total = urls.len();
        yield Ok(Event::default().event("progress").data(
            json!({"status": "syncing", "message": format!("发现 {} 个页面，开始并发同步...", total), "total": total, "current": 0}).to_string()
        ));

        // Create HTTP client for fetching busuanzi stats
        let client = Arc::new(
            reqwest::Client::builder()
                .timeout(Duration::from_secs(30))
                .pool_max_idle_per_host(concurrency)
                .build()
                .unwrap()
        );

        // Use channel for concurrent results
        let (tx, mut rx) = tokio::sync::mpsc::channel::<(usize, String, Result<(u64, u64, u64, String, String), String>)>(concurrency * 2);
        let semaphore = Arc::new(tokio::sync::Semaphore::new(concurrency));

        // Spawn concurrent tasks
        for (i, url) in urls.into_iter().enumerate() {
            let tx = tx.clone();
            let sem = semaphore.clone();
            let client = client.clone();

            tokio::spawn(async move {
                let _permit = sem.acquire().await.unwrap();

                let short_path = extract_short_path(&url);
                let result = fetch_and_parse(&client, &url).await;

                let _ = tx.send((i, short_path, result)).await;
            });
        }

        drop(tx);

        let mut imported = 0usize;
        let mut errors = 0usize;
        let mut completed = 0usize;

        while let Some((idx, short_path, result)) = rx.recv().await {
            completed += 1;

            match result {
                Ok((site_pv, site_uv, page_pv, host, path)) => {
                    let keys = get_keys(&host, &path);
                    store_stats(&keys.site_hash, &keys.page_key, &host, &path, site_pv, site_uv, page_pv);
                    imported += 1;

                    yield Ok(Event::default().event("progress").data(
                        json!({
                            "status": "syncing",
                            "total": total,
                            "current": completed,
                            "imported": imported,
                            "errors": errors,
                            "path": short_path,
                            "page_pv": page_pv,
                            "site_pv": site_pv,
                            "site_uv": site_uv
                        }).to_string()
                    ));
                }
                Err(e) => {
                    tracing::warn!("Failed to fetch stats (idx {}): {}", idx, e);
                    errors += 1;

                    yield Ok(Event::default().event("progress").data(
                        json!({
                            "status": "syncing",
                            "total": total,
                            "current": completed,
                            "imported": imported,
                            "errors": errors,
                            "path": short_path,
                            "error": e
                        }).to_string()
                    ));
                }
            }
        }

        if let Err(e) = crate::state::save().await {
            tracing::error!("Failed to save after sync: {}", e);
        }

        yield Ok(Event::default().event("complete").data(
            json!({
                "message": format!("同步完成: {}/{} 成功, {} 失败", imported, total, errors),
                "total": total,
                "imported": imported,
                "errors": errors
            }).to_string()
        ));
    };

    Sse::new(stream).keep_alive(KeepAlive::default())
}

fn extract_short_path(url: &str) -> String {
    let path = url::Url::parse(url)
        .map(|u| u.path().to_string())
        .unwrap_or_else(|_| url.to_string());

    if path.len() > 40 {
        format!("{}...", &path[..37])
    } else {
        path
    }
}

async fn fetch_and_parse(
    client: &reqwest::Client,
    url: &str,
) -> Result<(u64, u64, u64, String, String), String> {
    let (site_pv, site_uv, page_pv) = fetch_busuanzi_stats(client, url).await?;

    let parsed = url::Url::parse(url).map_err(|_| "Invalid URL")?;
    let host = parsed.host_str().unwrap_or("").to_string();
    let path = parsed.path().to_string();

    Ok((site_pv, site_uv, page_pv, host, path))
}

fn store_stats(
    site_hash: &str,
    page_key: &str,
    host: &str,
    path: &str,
    site_pv: u64,
    site_uv: u64,
    page_pv: u64,
) {
    // Only update if higher
    let current_site_pv = STORE
        .site_pv
        .get(site_hash)
        .map(|v| v.load(Ordering::Relaxed))
        .unwrap_or(0);

    if site_pv > current_site_pv {
        STORE
            .site_pv
            .entry(site_hash.to_string())
            .or_insert_with(|| AtomicU64::new(0))
            .store(site_pv, Ordering::Relaxed);
    }

    let current_site_uv = STORE
        .site_uv
        .get(site_hash)
        .map(|v| v.load(Ordering::Relaxed))
        .unwrap_or(0);

    if site_uv > current_site_uv {
        STORE
            .site_uv
            .entry(site_hash.to_string())
            .or_insert_with(|| AtomicU64::new(0))
            .store(site_uv, Ordering::Relaxed);
    }

    STORE
        .site_visitors
        .entry(site_hash.to_string())
        .or_default();
    STORE
        .site_hosts
        .entry(site_hash.to_string())
        .or_insert_with(|| host.to_string());
    STORE
        .page_paths
        .entry(page_key.to_string())
        .or_insert_with(|| path.to_string());

    STORE
        .page_pv
        .entry(page_key.to_string())
        .or_insert_with(|| AtomicU64::new(0))
        .store(page_pv, Ordering::Relaxed);
}

fn parse_sitemap(xml: &str) -> Result<Vec<String>, String> {
    let doc = roxmltree::Document::parse(xml).map_err(|e| e.to_string())?;

    let mut urls = Vec::new();

    for node in doc.descendants() {
        if node.tag_name().name() == "loc" {
            if let Some(text) = node.text() {
                let url = text.trim();
                // Skip sitemap index files
                if !url.ends_with(".xml") {
                    urls.push(url.to_string());
                }
            }
        }
    }

    Ok(urls)
}

/// Fetch stats from original busuanzi with retry
async fn fetch_busuanzi_stats(
    client: &reqwest::Client,
    page_url: &str,
) -> Result<(u64, u64, u64), String> {
    const MAX_RETRIES: u32 = 3;

    for attempt in 0..MAX_RETRIES {
        match fetch_busuanzi_stats_once(client, page_url).await {
            Ok(result) => return Ok(result),
            Err(e) if attempt < MAX_RETRIES - 1 => {
                let delay = 500 * (1 << attempt);
                tokio::time::sleep(Duration::from_millis(delay as u64)).await;
                continue;
            }
            Err(e) => return Err(e),
        }
    }

    Err("Max retries exceeded".to_string())
}

async fn fetch_busuanzi_stats_once(
    client: &reqwest::Client,
    page_url: &str,
) -> Result<(u64, u64, u64), String> {
    let ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis();

    let api_url = format!(
        "https://busuanzi.ibruce.info/busuanzi?jsonpCallback=cb&_={}",
        ts
    );

    let res = client
        .get(&api_url)
        .header("Referer", page_url)
        .header(
            "User-Agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        )
        .send()
        .await
        .map_err(|e| e.to_string())?;

    // Check for rate limiting
    if res.status() == 503 || res.status() == 429 {
        return Err("Rate limited".to_string());
    }

    let text = res.text().await.map_err(|e| e.to_string())?;

    // Check if response looks like HTML error page
    if text.contains("<!DOCTYPE") || text.contains("<html") {
        return Err("Rate limited (HTML response)".to_string());
    }

    // Parse JSONP: try{cb({"site_uv":123,"page_pv":456,...});}catch(e){}
    let start = text.find("cb(").map(|i| i + 3);
    let end = text.find(");");

    let json_str = match (start, end) {
        (Some(s), Some(e)) if s < e => Some(&text[s..e]),
        _ => None,
    };

    let json_str = json_str.ok_or_else(|| {
        let preview = if text.len() > 200 {
            &text[..200]
        } else {
            &text
        };
        format!("Invalid JSONP: {}", preview)
    })?;

    let data: serde_json::Value = serde_json::from_str(json_str)
        .map_err(|e| format!("JSON parse error: {} for: {}", e, json_str))?;

    Ok((
        data["site_pv"].as_u64().unwrap_or(0),
        data["site_uv"].as_u64().unwrap_or(0),
        data["page_pv"].as_u64().unwrap_or(0),
    ))
}
