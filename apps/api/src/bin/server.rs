use clean_savar_api::{
    build_router,
    config::AppConfig,
    db::{init_pool, AppState},
};
use std::net::SocketAddr;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();

    if std::env::var("RUST_LOG").is_err() {
        std::env::set_var("RUST_LOG", "info,clean_savar_api=debug,tower_http=debug");
    }
    tracing_subscriber::fmt::init();

    let cfg = AppConfig::from_env().map_err(|err| {
        eprintln!("Configuration error: {err}");
        err
    })?;

    println!("Connecting to database at {}...", cfg.database_url.split('@').last().unwrap_or(""));
    let pool = init_pool(&cfg.database_url).await?;

    tokio::fs::create_dir_all(&cfg.upload_dir).await?;

    let bind_addr: SocketAddr = cfg
        .bind_addr
        .parse()
        .unwrap_or_else(|_| "0.0.0.0:8080".parse().unwrap());

    let state = AppState::from_parts(pool, &cfg);
    let app = build_router(state, &cfg);

    println!("Clean Savar standalone REST API listening on http://{bind_addr}");
    println!("Health check available at http://{bind_addr}/api/v1/health");

    let listener = tokio::net::TcpListener::bind(bind_addr).await?;
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await?;

    Ok(())
}
