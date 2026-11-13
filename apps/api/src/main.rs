use clean_savar_api::{
    build_router,
    config::AppConfig,
    db::{init_pool, AppState},
};
use shuttle_runtime::SecretStore;

#[shuttle_runtime::main]
async fn main(
    #[shuttle_runtime::Secrets] secrets: SecretStore,
) -> shuttle_axum::ShuttleAxum {
    dotenvy::dotenv().ok();

    let cfg = AppConfig::from_secrets_and_env(&secrets).map_err(|err| {
        tracing::error!(error = %err, "invalid Shuttle API configuration");
        shuttle_runtime::Error::Custom(anyhow::anyhow!(err))
    })?;

    let pool = init_pool(&cfg.database_url).await.map_err(|err| {
        tracing::error!(error = %err, "database connection or migration failed");
        shuttle_runtime::Error::Custom(err.into())
    })?;

    tokio::fs::create_dir_all(&cfg.upload_dir)
        .await
        .map_err(|err| {
            tracing::error!(error = %err, path = %cfg.upload_dir, "failed to create upload directory");
            shuttle_runtime::Error::Custom(err.into())
        })?;

    let state = AppState::from_parts(pool, &cfg);
    let app = build_router(state, &cfg);

    tracing::info!(
        project_id = %cfg.firebase_project_id,
        "Clean Savar unified API initialized for Shuttle deployment"
    );

    Ok(app.into())
}
