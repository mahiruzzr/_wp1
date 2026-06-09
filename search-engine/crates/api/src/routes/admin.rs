use actix_web::{web, HttpResponse};
use common::types::{IndexStatus, StatsResponse};
use serde_json::json;

use crate::AppState;

pub async fn stats_handler(state: web::Data<AppState>) -> HttpResponse {
    let pool = &state.pool;
    let total_pages = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM pages")
        .fetch_one(pool)
        .await
        .unwrap_or(0);
    let total_domains = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM domains")
        .fetch_one(pool)
        .await
        .unwrap_or(0);

    let resp = StatsResponse {
        total_pages,
        total_domains,
        uptime_hours: 0.0,
    };
    HttpResponse::Ok().json(resp)
}

pub async fn index_status_handler(state: web::Data<AppState>) -> HttpResponse {
    let indexer = match &state.indexer {
        Some(idx) => idx.clone(),
        None => return HttpResponse::Ok().json(json!({"status": "not built", "total_documents": 0, "index_size_mb": 0.0})),
    };

    let total_documents = indexer.search_documents("", 0, 0).map(|(_, t)| t as u64).unwrap_or(0);
    let index_size_mb = std::fs::metadata(std::env::var("INDEX_PATH").unwrap_or_else(|_| "./data/index".into()))
        .map(|m| m.len() as f64 / 1024.0 / 1024.0)
        .unwrap_or(0.0);

    let resp = IndexStatus {
        total_documents,
        index_size_mb,
        status: "ready".into(),
    };
    HttpResponse::Ok().json(resp)
}
