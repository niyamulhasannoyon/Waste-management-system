mod auth;
mod config;
mod db;
mod error;
mod models;
mod routes;

use axum::{extract::DefaultBodyLimit, http::HeaderValue, Router};
use tokio::net::TcpListener;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::{
    config::AppConfig,
    db::{init_pool, AppState},
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "clean_savar_api=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config = AppConfig::from_env();
    let pool = init_pool(&config.database_url).await?;
    let bind_addr = config.bind_addr.clone();

    let cors = if config.cors_allowed_origins.is_empty() {
        CorsLayer::new()
            .allow_origin(Any)
            .allow_methods(Any)
            .allow_headers(Any)
    } else {
        let origins: Vec<HeaderValue> = config
            .cors_allowed_origins
            .iter()
            .filter_map(|o| o.parse::<HeaderValue>().ok())
            .collect();
        CorsLayer::new()
            .allow_origin(origins)
            .allow_methods(Any)
            .allow_headers(Any)
    };

    let state = AppState { pool, config };

    let app = Router::new()
        .nest("/api/v1", routes::api_router())
        .layer(DefaultBodyLimit::max(256 * 1024))
        .layer(cors)
        .with_state(state);

    let listener = TcpListener::bind(&bind_addr).await?;
    tracing::info!("Clean Savar API listening on {}", bind_addr);

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}

async fn shutdown_signal() {
    let _ = tokio::signal::ctrl_c().await;
    tracing::info!("Shutting down Clean Savar API gracefully");
}
