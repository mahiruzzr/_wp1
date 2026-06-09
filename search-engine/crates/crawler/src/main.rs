mod frontier;
mod fetcher;
mod parser;
mod robots;
mod politeness;
mod dedup;

use anyhow::Result;
use common::config::AppConfig;
use common::db;
use std::sync::Arc;
use tokio::sync::Semaphore;
use tracing::info;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    let config = AppConfig::from_env()?;
    let pool = db::create_pool(&config.database_url).await?;
    let pool = Arc::new(pool);

    let domain_whitelist: Option<Vec<String>> = None;
    let max_pages = config.max_crawl_pages;
    let max_depth = config.max_crawl_depth;
    let politeness_ms = config.crawler_politeness_ms;

    info!("Crawler starting (max_pages={}, max_depth={})", max_pages, max_depth);

    // Read seed URLs from command line args or use a default
    let seed_urls: Vec<String> = std::env::args()
        .skip(1)
        .collect();

    if seed_urls.is_empty() {
        anyhow::bail!("Usage: crawler <seed_url1> <seed_url2> ...");
    }

    let semaphore = Arc::new(Semaphore::new(10));

    let mut crawled_count = 0;
    let mut queue: Vec<(String, usize)> = seed_urls.iter().map(|u| (u.clone(), 0)).collect();
    let mut visited = std::collections::HashSet::new();

    while let Some((url, depth)) = queue.pop() {
        if crawled_count >= max_pages {
            info!("Reached max pages ({})", max_pages);
            break;
        }
        if depth > max_depth {
            continue;
        }
        if !visited.insert(url.clone()) {
            continue;
        }

        let _permit = semaphore.clone().acquire_owned().await?;

        info!("Crawling [{}]: {}", depth, url);

        match fetcher::fetch_page(&url, &config.crawler_user_agent).await {
            Ok((html, http_status, content_type)) => {
                let body = parser::extract_text(&html);
                let links = parser::extract_links(&html, &url);

                let checksum = dedup::compute_checksum(&body);

                let domain_name = url::Url::parse(&url)
                    .ok()
                    .and_then(|u| u.host_str().map(|h| h.to_string()));

                // Store domain if new
                if let Some(ref d) = domain_name {
                    sqlx::query(
                        "INSERT INTO domains (domain) VALUES ($1) ON CONFLICT (domain) DO NOTHING"
                    )
                    .bind(d)
                    .execute(&*pool)
                    .await
                    .ok();
                }

                let domain_id = if let Some(ref d) = domain_name {
                    sqlx::query_scalar::<_, i32>("SELECT id FROM domains WHERE domain = $1")
                        .bind(d)
                        .fetch_optional(&*pool)
                        .await
                        .ok()
                        .flatten()
                } else {
                    None
                };

                // Store page
                sqlx::query(
                    r#"INSERT INTO pages (url, domain_id, title, body, html, http_status, content_type, content_length, checksum)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ON CONFLICT (url) DO UPDATE SET
                        title = EXCLUDED.title, body = EXCLUDED.body, html = EXCLUDED.html,
                        http_status = EXCLUDED.http_status, fetch_count = pages.fetch_count + 1"#
                )
                .bind(&url)
                .bind(domain_id)
                .bind(parser::extract_title(&html))
                .bind(&body)
                .bind(&html)
                .bind(http_status as i32)
                .bind(&content_type)
                .bind(body.len() as i32)
                .bind(&checksum)
                .execute(&*pool)
                .await
                .ok();

                crawled_count += 1;

                // Enqueue links
                for link in links {
                    if visited.contains(&link) {
                        continue;
                    }
                    if let Some(ref wl) = domain_whitelist {
                        let host = url::Url::parse(&link).ok().and_then(|u| u.host_str().map(String::from));
                        if let Some(h) = host {
                            if !wl.contains(&h) {
                                continue;
                            }
                        }
                    }
                    queue.push((link, depth + 1));
                }

                tokio::time::sleep(std::time::Duration::from_millis(politeness_ms)).await;
            }
            Err(e) => {
                info!("Failed to fetch {}: {}", url, e);
            }
        }
    }

    info!("Crawl complete. {} pages crawled.", crawled_count);
    Ok(())
}
