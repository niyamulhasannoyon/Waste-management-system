use axum::{
    extract::{Query, State},
    Json,
};

use crate::{
    db::{resolve_ward_id_by_coords, validate_coords, AppState},
    error::AppError,
    models::ward::{ResolveWardQuery, ResolvedWardResponse, WardSummary},
};

pub async fn list_wards(State(state): State<AppState>) -> Result<Json<Vec<WardSummary>>, AppError> {
    let wards = sqlx::query_as::<_, WardSummary>(
        r#"
        SELECT
            w.id,
            w.code,
            w.name_bn,
            w.name_en,
            w.zone_label_bn,
            w.supervisor_name,
            w.supervisor_phone,
            ST_Y(w.centroid) AS centroid_lat,
            ST_X(w.centroid) AS centroid_lng,
            COALESCE((
                SELECT COUNT(*) FROM pickup_requests pr
                WHERE pr.ward_id = w.id AND pr.status IN ('pending', 'assigned', 'in_progress')
            ), 0) AS pending_pickups,
            COALESCE((
                SELECT COUNT(*) FROM dump_reports dr
                WHERE dr.ward_id = w.id AND dr.status IN ('reported', 'verified', 'dispatched')
            ), 0) AS open_reports,
            COALESCE((
                SELECT COUNT(*) FROM collector_vehicles cv
                WHERE cv.ward_id = w.id AND cv.status != 'offline'
            ), 0) AS active_vehicles
        FROM wards w
        WHERE w.is_active = TRUE
        ORDER BY w.id ASC
        "#,
    )
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(wards))
}

pub async fn resolve_ward(
    State(state): State<AppState>,
    Query(query): Query<ResolveWardQuery>,
) -> Result<Json<ResolvedWardResponse>, AppError> {
    validate_coords(query.lat, query.lng)?;

    let exact_id: Option<i16> = sqlx::query_scalar(
        r#"
        SELECT id FROM wards
        WHERE is_active = TRUE
          AND ST_Contains(boundary, ST_SetSRID(ST_MakePoint($1, $2), 4326))
        LIMIT 1
        "#,
    )
    .bind(query.lng)
    .bind(query.lat)
    .fetch_optional(&state.pool)
    .await?;

    let ward_id = match exact_id {
        Some(id) => id,
        None => resolve_ward_id_by_coords(&state.pool, query.lat, query.lng).await?,
    };

    #[derive(sqlx::FromRow)]
    struct WardMeta {
        code: String,
        name_bn: String,
        zone_label_bn: String,
    }

    let meta = sqlx::query_as::<_, WardMeta>(
        "SELECT code, name_bn, zone_label_bn FROM wards WHERE id = $1",
    )
    .bind(ward_id)
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(ResolvedWardResponse {
        ward_id,
        code: meta.code,
        name_bn: meta.name_bn,
        zone_label_bn: meta.zone_label_bn,
        exact_match: exact_id.is_some(),
    }))
}
