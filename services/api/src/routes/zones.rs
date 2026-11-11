use axum::{
    extract::{Query, State},
    Json,
};

use crate::{
    db::{resolve_zone_id_by_coords, validate_coords, AppState},
    error::AppError,
    models::zone::{ResolveZoneQuery, ResolvedZoneResponse, ServiceZoneRecord, ZoneType},
};

pub async fn list_zones(
    State(state): State<AppState>,
) -> Result<Json<Vec<ServiceZoneRecord>>, AppError> {
    let zones = sqlx::query_as::<_, ServiceZoneRecord>(
        r#"
        SELECT
            id,
            code,
            name_en,
            name_bn,
            zone_type,
            ward_number,
            ST_Y(centroid::geometry) AS centroid_lat,
            ST_X(centroid::geometry) AS centroid_lng,
            is_active
        FROM service_zones
        WHERE is_active = TRUE
        ORDER BY zone_type ASC, ward_number ASC NULLS LAST, id ASC
        "#,
    )
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(zones))
}

pub async fn resolve_zone(
    State(state): State<AppState>,
    Query(query): Query<ResolveZoneQuery>,
) -> Result<Json<ResolvedZoneResponse>, AppError> {
    validate_coords(query.lat, query.lng)?;

    let exact_id: Option<i32> = sqlx::query_scalar(
        r#"
        SELECT id
        FROM service_zones
        WHERE is_active = TRUE
          AND ST_Covers(boundary, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography)
        ORDER BY CASE WHEN zone_type = 'municipality_ward' THEN 0 ELSE 1 END ASC, id ASC
        LIMIT 1
        "#,
    )
    .bind(query.lng)
    .bind(query.lat)
    .fetch_optional(&state.pool)
    .await?;

    let ward_id = match exact_id {
        Some(id) => id,
        None => resolve_zone_id_by_coords(&state.pool, query.lat, query.lng).await?,
    };

    #[derive(sqlx::FromRow)]
    struct ZoneMeta {
        code: String,
        name_en: String,
        name_bn: String,
        zone_type: ZoneType,
    }

    let meta = sqlx::query_as::<_, ZoneMeta>(
        "SELECT code, name_en, name_bn, zone_type FROM service_zones WHERE id = $1",
    )
    .bind(ward_id)
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(ResolvedZoneResponse {
        ward_id,
        code: meta.code,
        name_en: meta.name_en,
        name_bn: meta.name_bn,
        zone_type: meta.zone_type,
        exact_match: exact_id.is_some(),
    }))
}
