use axum::{extract::State, Json};
use serde::Serialize;
use utoipa::ToSchema;

use crate::{
    db::AppState,
    error::{AppError, ErrorBody},
};

#[derive(Serialize, ToSchema)]
pub struct HealthResponse {
    #[schema(value_type = String)]
    pub status: &'static str,
    #[schema(value_type = String)]
    pub service: &'static str,
    pub postgis_version: String,
}

#[utoipa::path(
    get,
    path = "/api/v1/health",
    tag = "Health",
    responses(
        (status = 200, description = "Service and PostGIS health check", body = HealthResponse),
        (status = 500, description = "Database unavailable", body = ErrorBody)
    )
)]
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
