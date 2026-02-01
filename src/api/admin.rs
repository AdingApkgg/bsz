//! Admin API handlers

use axum::extract::Query;
use axum::response::sse::{Event, KeepAlive, Sse};
use axum::response::{IntoResponse, Json};
use futures::stream::Stream;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::convert::Infallible;
use std::sync::atomic::Ordering;

use crate::core::count::get_keys;
use crate::state::STORE;

/// GET /api/admin/stats
pub async fn stats_handler() -> impl IntoResponse {
    let total_sites = STORE.site_pv.len() as u64;
    let total_pages = STORE.page_pv.len() as u64;

    let mut total_site_pv: u64 = 0;
    let mut total_site_uv: u64 = 0;

    for entry in STORE.site_pv.iter() {
        total_site_pv += entry.value().load(Ordering::Relaxed);
    }
    for entry in STORE.site_uv.iter() {
        total_site_uv += entry.value().load(Ordering::Relaxed);
    }

    Json(json!({
        "success": true,
        "data": {
            "total_sites": total_sites,
            "total_pages": total_pages,
            "total_site_pv": total_site_pv,
            "total_site_uv": total_site_uv
        }
    }))
}

#[derive(Debug, Deserialize)]
pub struct ListKeysParams {
    pub cursor: Option<usize>,
    pub count: Option<usize>,
}

#[derive(Debug, Serialize)]
pub struct KeyInfo {
    pub site_hash: String,
    pub host: Option<String>,
    pub site_pv: u64,
    pub site_uv: u64,
    pub page_count: usize,
}

pub async fn list_keys_handler(Query(params): Query<ListKeysParams>) -> impl IntoResponse {
    let cursor = params.cursor.unwrap_or(0);
    let count = params.count.unwrap_or(20);

    let mut keys: Vec<KeyInfo> = Vec::new();

    for (i, entry) in STORE.site_pv.iter().enumerate() {
        if i < cursor {
            continue;
        }
        if keys.len() >= count {
            break;
        }

        let site_hash = entry.key().clone();
        let site_pv = entry.value().load(Ordering::Relaxed);
        let site_uv = STORE
            .site_uv
            .get(&site_hash)
            .map(|v| v.load(Ordering::Relaxed))
            .unwrap_or(0);

        let prefix = format!("{}:", site_hash);
        let page_count = STORE
            .page_pv
            .iter()
            .filter(|p| p.key().starts_with(&prefix))
            .count();

        let host = STORE.site_hosts.get(&site_hash).map(|v| v.clone());

        keys.push(KeyInfo {
            site_hash,
            host,
            site_pv,
            site_uv,
            page_count,
        });
    }

    let next_cursor = if keys.len() == count {
        cursor + count
    } else {
        0
    };

    Json(json!({
        "success": true,
        "data": keys,
        "next_cursor": next_cursor
    }))
}

#[derive(Debug, Deserialize)]
pub struct DeleteKeyParams {
    pub site_hash: String,
    pub page_key: Option<String>,
}

pub async fn delete_key_handler(Query(params): Query<DeleteKeyParams>) -> impl IntoResponse {
    // If page_key is provided, delete single page; otherwise delete entire site
    if let Some(page_key) = &params.page_key {
        STORE.page_pv.remove(page_key);
        STORE.page_paths.remove(page_key);

        return Json(json!({
            "success": true,
            "message": "page deleted"
        }));
    }

    let hash = &params.site_hash;

    STORE.site_pv.remove(hash);
    STORE.site_uv.remove(hash);
    STORE.site_visitors.remove(hash);
    STORE.site_hosts.remove(hash);

    let prefix = format!("{}:", hash);
    STORE.page_pv.retain(|k, _| !k.starts_with(&prefix));
    STORE.page_paths.retain(|k, _| !k.starts_with(&prefix));

    Json(json!({
        "success": true,
        "message": "site deleted"
    }))
}

// ==================== Pages API ====================

#[derive(Debug, Deserialize)]
pub struct ListPagesParams {
    pub site_hash: String,
}

#[derive(Debug, Serialize)]
pub struct PageInfo {
    pub page_key: String,
    pub page_hash: String,
    pub path: Option<String>,
    pub pv: u64,
}

/// GET /api/admin/pages?site_hash=xxx
pub async fn list_pages_handler(Query(params): Query<ListPagesParams>) -> impl IntoResponse {
    let prefix = format!("{}:", params.site_hash);
    let mut pages: Vec<PageInfo> = Vec::new();

    for entry in STORE.page_pv.iter() {
        let key = entry.key();
        if key.starts_with(&prefix) {
            let pv = entry.value().load(Ordering::Relaxed);
            let page_hash = key.strip_prefix(&prefix).unwrap_or(key).to_string();
            let path = STORE.page_paths.get(key).map(|v| v.clone());

            pages.push(PageInfo {
                page_key: key.clone(),
                page_hash,
                path,
                pv,
            });
        }
    }

    // Sort by PV descending
    pages.sort_by(|a, b| b.pv.cmp(&a.pv));

    Json(json!({
        "success": true,
        "data": pages
    }))
}

#[derive(Debug, Deserialize)]
pub struct UpdatePageParams {
    pub page_key: String,
    pub pv: Option<u64>,
}

/// POST /api/admin/pages/update
pub async fn update_page_handler(Json(params): Json<UpdatePageParams>) -> impl IntoResponse {
    let key = &params.page_key;

    if let Some(pv) = params.pv {
        STORE
            .page_pv
            .entry(key.to_string())
            .or_insert_with(|| std::sync::atomic::AtomicU64::new(0))
            .store(pv, Ordering::Relaxed);
    }

    Json(json!({
        "success": true,
        "message": "updated"
    }))
}

#[derive(Debug, Deserialize)]
pub struct UpdateKeyParams {
    pub site_hash: String,
    pub key_type: String,
    pub value: Option<u64>,
}

pub async fn update_key_handler(Json(params): Json<UpdateKeyParams>) -> impl IntoResponse {
    let hash = &params.site_hash;

    match params.key_type.as_str() {
        "site_pv" => {
            if let Some(val) = params.value {
                STORE
                    .site_pv
                    .entry(hash.to_string())
                    .or_insert_with(|| std::sync::atomic::AtomicU64::new(0))
                    .store(val, Ordering::Relaxed);
            }
        }
        "site_uv" => {
            // Reset UV or set value
            if let Some(val) = params.value {
                STORE
                    .site_uv
                    .entry(hash.to_string())
                    .or_insert_with(|| std::sync::atomic::AtomicU64::new(0))
                    .store(val, Ordering::Relaxed);
            } else {
                // Reset to 0 and clear visitors
                if let Some(uv) = STORE.site_uv.get(hash) {
                    uv.store(0, Ordering::Relaxed);
                }
                if let Some(visitors) = STORE.site_visitors.get(hash) {
                    visitors.clear();
                }
            }
        }
        _ => {
            return Json(json!({
                "success": false,
                "message": "invalid key_type"
            }));
        }
    }

    Json(json!({
        "success": true,
        "message": "updated"
    }))
}

// ==================== Import API ====================

#[derive(Debug, Deserialize)]
pub struct SiteData {
    pub pv: u64,
    pub uv: Option<u64>,
}

#[derive(Debug, Deserialize)]
pub struct PageData {
    pub pv: u64,
}

#[derive(Debug, Deserialize)]
pub struct ImportData {
    pub sites: Option<std::collections::HashMap<String, SiteData>>,
    pub pages: Option<std::collections::HashMap<String, PageData>>,
}

/// POST /api/admin/import
/// Import data from Redis export or manual JSON
pub async fn import_handler(Json(data): Json<ImportData>) -> impl IntoResponse {
    let mut sites_imported = 0;
    let mut pages_imported = 0;

    // Import sites
    if let Some(sites) = data.sites {
        for (hash, site) in sites {
            STORE
                .site_pv
                .entry(hash.clone())
                .or_insert_with(|| std::sync::atomic::AtomicU64::new(0))
                .store(site.pv, Ordering::Relaxed);

            if let Some(uv) = site.uv {
                STORE
                    .site_uv
                    .entry(hash.clone())
                    .or_insert_with(|| std::sync::atomic::AtomicU64::new(0))
                    .store(uv, Ordering::Relaxed);
            }

            // Ensure visitors set exists
            STORE.site_visitors.entry(hash).or_default();

            sites_imported += 1;
        }
    }

    // Import pages (format: "site_hash:page_hash") - only PV, no page UV
    if let Some(pages) = data.pages {
        for (key, page) in pages {
            STORE
                .page_pv
                .entry(key)
                .or_insert_with(|| std::sync::atomic::AtomicU64::new(0))
                .store(page.pv, Ordering::Relaxed);

            pages_imported += 1;
        }
    }

    // Trigger save
    tokio::spawn(async {
        if let Err(e) = crate::state::save().await {
            tracing::error!("Failed to save after import: {}", e);
        }
    });

    Json(json!({
        "success": true,
        "message": format!("Imported {} sites, {} pages", sites_imported, pages_imported),
        "data": {
            "sites": sites_imported,
            "pages": pages_imported
        }
    }))
}

// ==================== Sitemap Sync ====================

#[derive(Debug, Deserialize)]
pub struct SitemapSyncParams {
    pub sitemap_url: String,
    pub concurrency: Option<usize>,
}

/// GET /api/admin/sync?sitemap_url=...&concurrency=3
/// Sync data from sitemap + busuanzi.ibruce.info with SSE progress (concurrent)
/// Default concurrency=3 to avoid rate limiting from original busuanzi
pub async fn sync_handler(
    Query(params): Query<SitemapSyncParams>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let sitemap_url = params.sitemap_url;
    let concurrency = params.concurrency.unwrap_or(3).clamp(1, 10);

    let stream = async_stream::stream! {
        yield Ok(Event::default().event("progress").data(
            json!({"status": "fetching", "message": format!("正在获取 sitemap (并发: {})...", concurrency)}).to_string()
        ));

        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .pool_max_idle_per_host(concurrency)
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

        let urls = match parse_sitemap(&sitemap_text) {
            Ok(urls) => urls,
            Err(e) => {
                yield Ok(Event::default().event("error").data(
                    json!({"message": format!("Failed to parse sitemap: {}", e)}).to_string()
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

        // Use channel for concurrent results
        let (tx, mut rx) = tokio::sync::mpsc::channel::<(usize, String, Result<(u64, u64, u64, String, String), String>)>(concurrency * 2);
        let semaphore = std::sync::Arc::new(tokio::sync::Semaphore::new(concurrency));
        let client = std::sync::Arc::new(client);

        // Spawn concurrent tasks
        for (i, url) in urls.into_iter().enumerate() {
            let tx = tx.clone();
            let sem = semaphore.clone();
            let client = client.clone();

            tokio::spawn(async move {
                let _permit = sem.acquire().await.unwrap();

                let path = url::Url::parse(&url)
                    .map(|u| u.path().to_string())
                    .unwrap_or_else(|_| url.clone());
                let short_path = if path.len() > 40 {
                    format!("{}...", &path[..37])
                } else {
                    path.clone()
                };

                let result = match fetch_busuanzi_stats(&client, &url).await {
                    Ok((site_pv, site_uv, page_pv)) => {
                        if let Ok(parsed) = url::Url::parse(&url) {
                            let host = parsed.host_str().unwrap_or("").to_string();
                            let path = parsed.path().to_string();
                            Ok((site_pv, site_uv, page_pv, host, path))
                        } else {
                            Err("Invalid URL".to_string())
                        }
                    }
                    Err(e) => Err(e),
                };

                let _ = tx.send((i, short_path, result)).await;
            });
        }

        drop(tx); // Close sender so rx will end

        let mut imported = 0usize;
        let mut errors = 0usize;
        let mut completed = 0usize;

        while let Some((idx, short_path, result)) = rx.recv().await {
            completed += 1;

            match result {
                Ok((site_pv, site_uv, page_pv, host, path)) => {
                    let keys = get_keys(&host, &path);

                    // Store site stats (only update if higher)
                    let current_site_pv = STORE
                        .site_pv
                        .get(&keys.site_hash)
                        .map(|v| v.load(Ordering::Relaxed))
                        .unwrap_or(0);

                    if site_pv > current_site_pv {
                        STORE
                            .site_pv
                            .entry(keys.site_hash.clone())
                            .or_insert_with(|| std::sync::atomic::AtomicU64::new(0))
                            .store(site_pv, Ordering::Relaxed);
                    }

                    let current_site_uv = STORE
                        .site_uv
                        .get(&keys.site_hash)
                        .map(|v| v.load(Ordering::Relaxed))
                        .unwrap_or(0);

                    if site_uv > current_site_uv {
                        STORE
                            .site_uv
                            .entry(keys.site_hash.clone())
                            .or_insert_with(|| std::sync::atomic::AtomicU64::new(0))
                            .store(site_uv, Ordering::Relaxed);
                    }

                    STORE.site_visitors.entry(keys.site_hash.clone()).or_default();
                    STORE.site_hosts.entry(keys.site_hash).or_insert_with(|| host.clone());
                    STORE.page_paths.entry(keys.page_key.clone()).or_insert_with(|| path.clone());

                    STORE
                        .page_pv
                        .entry(keys.page_key)
                        .or_insert_with(|| std::sync::atomic::AtomicU64::new(0))
                        .store(page_pv, Ordering::Relaxed);

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

fn parse_sitemap(xml: &str) -> Result<Vec<String>, String> {
    let doc = roxmltree::Document::parse(xml).map_err(|e| e.to_string())?;

    let mut urls = Vec::new();

    // Handle both sitemap index and urlset
    for node in doc.descendants() {
        if node.tag_name().name() == "loc" {
            if let Some(text) = node.text() {
                let url = text.trim();
                // If it's a sitemap index, we'd need to recurse, but for simplicity just collect URLs
                if !url.ends_with(".xml") {
                    urls.push(url.to_string());
                }
            }
        }
    }

    Ok(urls)
}

/// Fetch stats from original busuanzi with retry - returns (site_pv, site_uv, page_pv)
async fn fetch_busuanzi_stats(
    client: &reqwest::Client,
    page_url: &str,
) -> Result<(u64, u64, u64), String> {
    const MAX_RETRIES: u32 = 3;

    for attempt in 0..MAX_RETRIES {
        match fetch_busuanzi_stats_once(client, page_url).await {
            Ok(result) => return Ok(result),
            Err(e) if attempt < MAX_RETRIES - 1 => {
                // Wait before retry (exponential backoff: 500ms, 1s, 2s)
                let delay = 500 * (1 << attempt);
                tokio::time::sleep(std::time::Duration::from_millis(delay as u64)).await;
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
