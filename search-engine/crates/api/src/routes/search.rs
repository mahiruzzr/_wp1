use actix_web::{web, HttpResponse};
use common::types::{SearchRequest, SearchResponse, SearchHit};
use serde_json::json;
use std::time::Instant;

use crate::AppState;

pub async fn search_handler(
    state: web::Data<AppState>,
    body: web::Json<SearchRequest>,
) -> HttpResponse {
    let query = body.q.trim();
    if query.is_empty() {
        return HttpResponse::BadRequest().json(json!({"error": "query is required"}));
    }

    let page = body.page.unwrap_or(0);
    let size = body.size.unwrap_or(10).min(50);
    let start = Instant::now();

    let results = match &state.indexer {
        Some(idx) => match idx.search_documents(query, page, size) {
            Ok((hits, total)) => {
                let elapsed = start.elapsed().as_millis() as u64;
                let items: Vec<SearchHit> = hits
                    .into_iter()
                    .map(|(score, title, url, snippet, domain)| SearchHit { title, url, domain, snippet, score })
                    .collect();
                return HttpResponse::Ok().json(SearchResponse {
                    query: query.to_string(),
                    total,
                    page,
                    size,
                    time_ms: elapsed,
                    results: items,
                });
            }
            Err(e) => {
                HttpResponse::InternalServerError().json(json!({"error": e.to_string()}))
            }
        },
        None => {
            let elapsed = start.elapsed().as_millis() as u64;
            HttpResponse::Ok().json(SearchResponse {
                query: query.to_string(),
                total: 0,
                page,
                size,
                time_ms: elapsed,
                results: vec![],
            })
        }
    };
    results
}
