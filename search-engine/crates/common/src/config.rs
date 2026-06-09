use anyhow::Result;
use std::env;

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub database_url: String,
    pub index_path: String,
    pub api_host: String,
    pub api_port: u16,
    pub crawler_user_agent: String,
    pub crawler_politeness_ms: u64,
    pub max_crawl_pages: usize,
    pub max_crawl_depth: usize,
}

impl AppConfig {
    pub fn from_env() -> Result<Self> {
        Ok(Self {
            database_url: env::var("DATABASE_URL")
                .unwrap_or_else(|_| "postgres://search:search@localhost:5432/searchengine".into()),
            index_path: env::var("INDEX_PATH").unwrap_or_else(|_| "./data/index".into()),
            api_host: env::var("API_HOST").unwrap_or_else(|_| "0.0.0.0".into()),
            api_port: env::var("API_PORT").unwrap_or_else(|_| "8080".into()).parse()?,
            crawler_user_agent: env::var("CRAWL_USER_AGENT")
                .unwrap_or_else(|_| "SearchBot/1.0".into()),
            crawler_politeness_ms: env::var("CRAWL_POLITENESS_MS")
                .unwrap_or_else(|_| "500".into()).parse()?,
            max_crawl_pages: env::var("MAX_CRAWL_PAGES")
                .unwrap_or_else(|_| "5000".into()).parse()?,
            max_crawl_depth: env::var("MAX_CRAWL_DEPTH")
                .unwrap_or_else(|_| "5".into()).parse()?,
        })
    }
}
