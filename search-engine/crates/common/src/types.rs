use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Page {
    pub id: i32,
    pub url: String,
    pub domain_id: Option<i32>,
    pub title: Option<String>,
    pub body: Option<String>,
    pub html: Option<String>,
    pub http_status: Option<i32>,
    pub content_type: Option<String>,
    pub content_length: Option<i32>,
    pub crawl_time: Option<DateTime<Utc>>,
    pub checksum: Option<String>,
    pub fetch_count: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Domain {
    pub id: i32,
    pub domain: String,
    pub allowed: Option<bool>,
    pub robots_txt: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct CrawlQueueItem {
    pub id: i32,
    pub url: String,
    pub domain_id: Option<i32>,
    pub depth: Option<i32>,
    pub priority: Option<i32>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchRequest {
    pub q: String,
    pub page: Option<usize>,
    pub size: Option<usize>,
    pub domain: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResponse {
    pub query: String,
    pub total: u64,
    pub page: usize,
    pub size: usize,
    pub time_ms: u64,
    pub results: Vec<SearchHit>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchHit {
    pub title: String,
    pub url: String,
    pub domain: String,
    pub snippet: String,
    pub score: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrawlRequest {
    pub seed_urls: Vec<String>,
    pub max_pages: Option<usize>,
    pub max_depth: Option<usize>,
    pub politeness_ms: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrawlResponse {
    pub job_id: String,
    pub status: String,
    pub seed_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrawlStatus {
    pub job_id: String,
    pub status: String,
    pub pages_crawled: usize,
    pub pages_queued: usize,
    pub errors: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexStatus {
    pub total_documents: u64,
    pub index_size_mb: f64,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatsResponse {
    pub total_pages: i64,
    pub total_domains: i64,
    pub uptime_hours: f64,
}
