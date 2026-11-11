use axum::{extract::State, Json};
use serde::Serialize;

use crate::{db::AppState, error::AppError};

#[derive(Serialize)]
pub struct HealthResponse {
    pub status: &'static str,
    pub service: &'static str,
    pub postgis_version: String,
}

pub async fn health_check(State(state): State<AppState>) -> Result<Json<HealthResponse>, AppError> {
    let postgis_version: String = sqlx::query_scalar("SELECT PostGIS_Lib_Version()")
        .fetch_one(&state.pool)
        .await?;

    Ok(Json(HealthResponse {
        status: "ok",
        service: "clean-savar-api",
        postgis_version,
    }))
}
