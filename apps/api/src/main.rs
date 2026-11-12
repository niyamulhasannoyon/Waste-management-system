use std::net::SocketAddr;
use tokio::net::TcpListener;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

use clean_savar_api::{
    build_router,
    config::AppConfig,
    db::{init_pool, AppState},
    shutdown_signal,
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();

    let app_env = std::env::var("APP_ENV")
        .unwrap_or_else(|_| "development".to_string())
        .trim()
        .to_ascii_lowercase();
    let is_production = matches!(app_env.as_str(), "production" | "prod");
    let default_format = if is_production { "json" } else { "pretty" };
    let log_format = std::env::var("LOG_FORMAT")
        .unwrap_or_else(|_| default_format.to_string())
        .trim()
        .to_ascii_lowercase();

    let env_filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| {
        if is_production {
            "clean_savar_api=info,tower_http=info".into()
        } else {
            "clean_savar_api=debug,tower_http=info".into()
        }
    });

    if log_format == "json" {
        tracing_subscriber::registry()
            .with(env_filter)
            .with(tracing_subscriber::fmt::layer().json())
            .init();
    } else {
        tracing_subscriber::registry()
            .with(env_filter)
            .with(tracing_subscriber::fmt::layer())
            .init();
    }

    let cfg = AppConfig::from_env().map_err(|err| {
        tracing::error!(error = %err, "invalid API configuration");
        std::io::Error::new(std::io::ErrorKind::InvalidInput, err)
    })?;

    let pool = init_pool(&cfg.database_url).await?;
    tokio::fs::create_dir_all(&cfg.upload_dir).await?;

    let state = AppState::from_parts(pool, &cfg);
    let app = build_router(state, &cfg);

    let listener = TcpListener::bind(&cfg.bind_addr).await?;
    tracing::info!("Clean Savar unified API listening on {}", cfg.bind_addr);

    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .with_graceful_shutdown(shutdown_signal())
    .await?;

    Ok(())
}
