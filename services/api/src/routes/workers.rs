use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    Json,
};
use uuid::Uuid;

use crate::{
    auth::resolve_auth,
    db::{validate_coords, AppState},
    error::AppError,
    models::worker::{
        NearbyWorkerRecord, NearbyWorkersQuery, NearbyWorkersResponse,
        UpdateWorkerLocationRequest, WorkerLocationRecord,
    },
};

/// `GET /api/v1/workers/nearby`
/// Finds up to 5 closest online collectors to a pickup, complaint, or `(lat, lng)`
/// using PostGIS `ST_DWithin` (indexed GIST filter) and `ST_Distance` (exact meters).
pub async fn nearby_workers(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<NearbyWorkersQuery>,
) -> Result<Json<NearbyWorkersResponse>, AppError> {
    let _auth_user = resolve_auth(&state, &headers).await?;

    let has_pickup = query.pickup_id.is_some();
    let has_complaint = query.complaint_id.is_some();
    let has_coords = query.lat.is_some() || query.lng.is_some();

    let source_count = (has_pickup as u8) + (has_complaint as u8) + (has_coords as u8);
    if source_count != 1 {
        return Err(AppError::validation(
            "INVALID_TARGET_QUERY",
            "Specify exactly one target: pickup_id, complaint_id, or both lat and lng.",
        ));
    }

    #[derive(sqlx::FromRow)]
    struct TargetCoords {
        lat: f64,
        lng: f64,
    }

    let (target_lat, target_lng) = if let Some(pickup_id) = query.pickup_id {
        let coords = sqlx::query_as::<_, TargetCoords>(
            r#"
            SELECT
                ST_Y(location::geometry) AS lat,
                ST_X(location::geometry) AS lng
            FROM pickup_requests
            WHERE id = $1
            "#,
        )
        .bind(pickup_id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or_else(|| AppError::not_found("PICKUP_NOT_FOUND", "Pickup request not found."))?;
        (coords.lat, coords.lng)
    } else if let Some(complaint_id) = query.complaint_id {
        let coords = sqlx::query_as::<_, TargetCoords>(
            r#"
            SELECT
                ST_Y(location::geometry) AS lat,
                ST_X(location::geometry) AS lng
            FROM garbage_complaints
            WHERE id = $1
            "#,
        )
        .bind(complaint_id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or_else(|| {
            AppError::not_found("COMPLAINT_NOT_FOUND", "Garbage complaint not found.")
        })?;
        (coords.lat, coords.lng)
    } else {
        match (query.lat, query.lng) {
            (Some(lat), Some(lng)) => {
                validate_coords(lat, lng)?;
                (lat, lng)
            }
            _ => {
                return Err(AppError::validation(
                    "MISSING_COORDINATES",
                    "Both lat and lng query parameters are required together.",
                ));
            }
        }
    };

    let radius_meters = query
        .radius_meters
        .filter(|r| r.is_finite())
        .unwrap_or(state.config.nearby_default_radius_meters)
        .clamp(50.0, 50_000.0);
    let limit = query.limit.unwrap_or(5).clamp(1, 20);

    let workers = sqlx::query_as::<_, NearbyWorkerRecord>(
        r#"
        SELECT
            w.id,
            w.full_name,
            w.phone,
            w.vehicle_type,
            w.vehicle_code,
            w.ward_id,
            sz.name_en AS ward_name_en,
            sz.name_bn AS ward_name_bn,
            w.is_online,
            ST_Y(w.current_location::geometry) AS lat,
            ST_X(w.current_location::geometry) AS lng,
            ST_Distance(
                w.current_location,
                ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
            ) AS distance_meters,
            w.last_seen_at
        FROM workers w
        LEFT JOIN service_zones sz ON sz.id = w.ward_id
        WHERE w.is_online = TRUE
          AND ST_DWithin(
                w.current_location,
                ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
                $3
              )
        ORDER BY distance_meters ASC
        LIMIT $4
        "#,
    )
    .bind(target_lng)
    .bind(target_lat)
    .bind(radius_meters)
    .bind(limit)
    .fetch_all(&state.pool)
    .await?;

    let count = workers.len();
    Ok(Json(NearbyWorkersResponse {
        target_lat,
        target_lng,
        radius_meters,
        count,
        workers,
    }))
}

/// `PATCH /api/v1/workers/:id/location`
/// Updates a field collector's live GPS location and online presence.
pub async fn update_worker_location(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateWorkerLocationRequest>,
) -> Result<Json<WorkerLocationRecord>, AppError> {
    let _auth_user = resolve_auth(&state, &headers).await?;
    validate_coords(payload.lat, payload.lng)?;

    let updated = sqlx::query_as::<_, WorkerLocationRecord>(
        r#"
        UPDATE workers
        SET current_location = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
            is_online = COALESCE($3, is_online),
            last_seen_at = NOW(),
            updated_at = NOW()
        WHERE id = $4
        RETURNING
            id,
            full_name,
            phone,
            vehicle_type,
            vehicle_code,
            ward_id,
            is_online,
            ST_Y(current_location::geometry) AS lat,
            ST_X(current_location::geometry) AS lng,
            last_seen_at
        "#,
    )
    .bind(payload.lng)
    .bind(payload.lat)
    .bind(payload.is_online)
    .bind(id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::not_found("WORKER_NOT_FOUND", "Worker not found."))?;

    Ok(Json(updated))
}
