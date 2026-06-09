mod routes;

use actix_cors::Cors;
use actix_web::{web, App, HttpServer};
use indexer::builder::IndexBuilder;
use std::sync::Arc;
use tracing::info;

pub struct AppState {
    pub pool: sqlx::PgPool,
    pub indexer: Option<Arc<IndexBuilder>>,
}

#[actix_web::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();
    let config = common::config::AppConfig::from_env()?;
    let pool = common::db::create_pool(&config.database_url).await?;

    let indexer = match IndexBuilder::open(&config.index_path) {
        Ok(idx) => {
            info!("Index opened at {}", config.index_path);
            Some(Arc::new(idx))
        }
        Err(e) => {
            info!("No existing index at {} ({}), running without index", config.index_path, e);
            None
        }
    };

    let state = web::Data::new(AppState { pool, indexer });

    info!("API server starting on {}:{}", config.api_host, config.api_port);

    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);

        App::new()
            .wrap(cors)
            .app_data(state.clone())
            .service(
                web::scope("/api/v1")
                    .route("/search", web::post().to(routes::search::search_handler))
                    .route("/stats", web::get().to(routes::admin::stats_handler))
                    .route("/index/status", web::get().to(routes::admin::index_status_handler))
            )
    })
    .bind(format!("{}:{}", config.api_host, config.api_port))?
    .run()
    .await?;

    Ok(())
}
