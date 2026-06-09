use anyhow::Result;
use common::config::AppConfig;
use common::db;
use indexer::builder::IndexBuilder;
use tracing::info;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    let config = AppConfig::from_env()?;
    let pool = db::create_pool(&config.database_url).await?;

    info!("Starting indexer, connecting to DB...");

    let pages = sqlx::query_as::<_, common::types::Page>(
        "SELECT id, url, domain_id, title, body, html, http_status, content_type, content_length, crawl_time, checksum, fetch_count FROM pages WHERE body IS NOT NULL"
    )
    .fetch_all(&pool)
    .await?;

    info!("Loaded {} pages from database", pages.len());

    let indexer = IndexBuilder::open(&config.index_path)?;
    indexer.build_index(&pages)?;

    let count = indexer.search_documents("test", 0, 1)?.1;
    info!("Index ready. Total documents: {}", count);

    Ok(())
}
