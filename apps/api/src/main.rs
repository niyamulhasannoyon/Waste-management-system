mod config;
mod db;
mod error;
mod models;
mod routes;

use axum::{extract::DefaultBodyLimit, http::HeaderValue, Router};
use tokio::net::TcpListener;
use tower_http::{
    cors::{Any, CorsLayer},
    services::ServeDir,
    trace::TraceLayer,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::{config::AppConfig, db::{init_pool, AppState}};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "clean_savar_api=debug,tower_http=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let cfg = AppConfig::from_env()?;
    let pool = init_pool(&cfg.database_url).await?;

    tokio::fs::create_dir_all(&cfg.upload_dir).await?;

    let state = AppState {
        pool,
        upload_dir: cfg.upload_dir.clone(),
        public_upload_base_url: cfg.public_upload_base_url.clone(),
        max_upload_bytes: cfg.max_upload_bytes,
    };

    let cors = if cfg.cors_allowed_origins.is_empty() {
        CorsLayer::new().allow_origin(Any).allow_methods(Any).allow_headers(Any)
    } else {
        let origins: Vec<HeaderValue> = cfg
            .cors_allowed_origins
            .iter()
            .filter_map(|o| o.parse::<HeaderValue>().ok())
            .collect();
        CorsLayer::new()
            .allow_origin(origins)
            .allow_methods(Any)
            .allow_headers(Any)
    };

    let app = Router::new()
        .nest("/api/v1", routes::api_router())
        .nest_service("/uploads", ServeDir::new(&cfg.upload_dir))
        .layer(DefaultBodyLimit::max(cfg.max_upload_bytes + 512 * 1024))
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .with_state(state);

    let listener = TcpListener::bind(&cfg.bind_addr).await?;
    tracing::info!("Clean Savar API listening on {}", cfg.bind_addr);

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}

async fn shutdown_signal() {
    let _ = tokio::signal::ctrl_c().await;
    tracing::info!("Shutting down Clean Savar API gracefully");
}
