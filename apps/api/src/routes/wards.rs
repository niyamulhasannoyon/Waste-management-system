use axum::{
    extract::{Query, State},
    http::{header, HeaderMap, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    Json,
};

use crate::{
    auth::{require_role, Role},
    db::{resolve_ward_id_and_match, sha256_hex, validate_coords, AppState},
    error::AppError,
    models::ward::{AnalyticsSummary, ResolveWardQuery, ResolvedWardResponse, WardSummary},
};

/// `GET /api/v1/wards`
/// Single-pass aggregated ward & union list (eliminates N+1 subqueries) with ETag caching.
pub async fn list_wards(
    State(state): State<AppState>,
    req_headers: HeaderMap,
) -> Result<Response, AppError> {
    let wards = sqlx::query_as::<_, WardSummary>(
        r#"
        WITH pickup_counts AS (
            SELECT ward_id, COUNT(*) AS cnt
            FROM pickup_requests
            WHERE status IN ('pending', 'assigned', 'in_progress')
            GROUP BY ward_id
        ),
        report_counts AS (
            SELECT ward_id, COUNT(*) AS cnt
            FROM dump_reports
            WHERE status IN ('reported', 'verified', 'dispatched')
              AND duplicate_of IS NULL
            GROUP BY ward_id
        ),
        vehicle_counts AS (
            SELECT ward_id, COUNT(*) AS cnt
            FROM collector_vehicles
            WHERE status != 'offline'
            GROUP BY ward_id
        )
        SELECT
            w.id,
            w.code,
            w.zone_type,
            w.ward_number,
            w.name_bn,
            w.name_en,
            w.zone_label_bn,
            w.neighborhoods,
            w.schedule_bn,
            w.frequency_bn,
            w.supervisor_name,
            w.supervisor_phone,
            ST_Y(w.centroid) AS centroid_lat,
            ST_X(w.centroid) AS centroid_lng,
            COALESCE(p.cnt, 0) AS pending_pickups,
            COALESCE(r.cnt, 0) AS open_reports,
            COALESCE(v.cnt, 0) AS active_vehicles
        FROM wards w
        LEFT JOIN pickup_counts p ON p.ward_id = w.id
        LEFT JOIN report_counts r ON r.ward_id = w.id
        LEFT JOIN vehicle_counts v ON v.ward_id = w.id
        WHERE w.is_active = TRUE
        ORDER BY w.zone_type ASC, w.ward_number ASC NULLS LAST, w.id ASC
        "#,
    )
    .fetch_all(&state.pool)
    .await?;

    let payload_json = serde_json::to_string(&wards).unwrap_or_default();
    let etag_value = format!("\"{}\"", &sha256_hex(&payload_json)[..16]);

    let mut headers = HeaderMap::new();
    headers.insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static("public, max-age=30"),
    );
    if let Ok(etag) = HeaderValue::from_str(&etag_value) {
        headers.insert(header::ETAG, etag);
    }

    if req_headers
        .get(header::IF_NONE_MATCH)
        .and_then(|v| v.to_str().ok())
        .is_some_and(|raw| {
            raw.split(',')
                .map(str::trim)
                .any(|tag| tag == "*" || tag == etag_value)
        })
    {
        return Ok((StatusCode::NOT_MODIFIED, headers).into_response());
    }

    Ok((headers, Json(wards)).into_response())
}

/// `GET /api/v1/wards/resolve`
/// Single spatial query resolving Savar coordinates to their exact containing zone or nearest centroid.
pub async fn resolve_ward(
    State(state): State<AppState>,
    Query(query): Query<ResolveWardQuery>,
) -> Result<Json<ResolvedWardResponse>, AppError> {
    validate_coords(query.lat, query.lng)?;

    let (ward_id, exact_match) =
        resolve_ward_id_and_match(&state.pool, query.lat, query.lng).await?;

    #[derive(sqlx::FromRow)]
    struct WardMeta {
        code: String,
        zone_type: String,
        name_bn: String,
        name_en: String,
        zone_label_bn: String,
    }

    let meta = sqlx::query_as::<_, WardMeta>(
        "SELECT code, zone_type, name_bn, name_en, zone_label_bn FROM wards WHERE id = $1",
    )
    .bind(ward_id)
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(ResolvedWardResponse {
        ward_id,
        code: meta.code,
        zone_type: meta.zone_type,
        name_bn: meta.name_bn,
        name_en: meta.name_en,
        zone_label_bn: meta.zone_label_bn,
        exact_match,
    }))
}

/// `GET /api/v1/analytics/public`
/// Non-PII operational summary computed live from PostGIS records (never hardcoded offsets).
#[utoipa::path(
    get,
    path = "/api/v1/analytics/public",
    tag = "Wards",
    responses(
        (status = 200, description = "Public operational analytics summary", body = AnalyticsSummary)
    )
)]
pub async fn public_analytics(State(state): State<AppState>) -> Result<Json<AnalyticsSummary>, AppError> {
    let summary = compute_analytics(&state).await?;
    Ok(Json(summary))
}

/// `GET /api/v1/analytics/summary` (Admin only)
#[utoipa::path(
    get,
    path = "/api/v1/analytics/summary",
    tag = "Admin",
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "Admin operational analytics summary", body = AnalyticsSummary),
        (status = 403, description = "Admin access required", body = ErrorBody)
    )
)]
pub async fn admin_analytics(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<AnalyticsSummary>, AppError> {
    let _admin = require_role(&state, &headers, &[Role::Admin]).await?;
    let summary = compute_analytics(&state).await?;
    Ok(Json(summary))
}

async fn compute_analytics(state: &AppState) -> Result<AnalyticsSummary, AppError> {
    #[derive(sqlx::FromRow)]
    struct RawStats {
        total_pickups: i64,
        pending_pickups: i64,
        completed_pickups: i64,
        total_reports: i64,
        open_reports: i64,
        cleared_reports: i64,
        collected_weight_today_kg: f64,
        active_vehicles: i64,
        recyclable_open_kg: f64,
    }

    let row = sqlx::query_as::<_, RawStats>(
        r#"
        SELECT
            (SELECT COUNT(*) FROM pickup_requests) AS total_pickups,
            (SELECT COUNT(*) FROM pickup_requests WHERE status IN ('pending', 'assigned', 'in_progress')) AS pending_pickups,
            (SELECT COUNT(*) FROM pickup_requests WHERE status = 'collected') AS completed_pickups,
            (SELECT COUNT(*) FROM dump_reports WHERE duplicate_of IS NULL) AS total_reports,
            (SELECT COUNT(*) FROM dump_reports WHERE status IN ('reported', 'verified', 'dispatched') AND duplicate_of IS NULL) AS open_reports,
            (SELECT COUNT(*) FROM dump_reports WHERE status = 'cleared' AND duplicate_of IS NULL) AS cleared_reports,
            COALESCE((
                SELECT SUM(weight_kg)::float8
                FROM task_completions
                WHERE completed_at >= (date_trunc('day', NOW() AT TIME ZONE 'Asia/Dhaka') AT TIME ZONE 'Asia/Dhaka')
                  AND weight_kg IS NOT NULL
            ), 0.0) AS collected_weight_today_kg,
            (SELECT COUNT(*) FROM collector_vehicles WHERE status != 'offline') AS active_vehicles,
            COALESCE((
                SELECT SUM(estimated_kg)::float8
                FROM recyclable_lots
                WHERE status = 'open'
            ), 0.0) AS recyclable_open_kg
        "#,
    )
    .fetch_one(&state.pool)
    .await?;

    let resolved_total = row.cleared_reports + row.completed_pickups;
    let overall_total = row.total_reports + row.total_pickups;
    let resolution_rate_percent = if overall_total > 0 {
        ((resolved_total as f64 / overall_total as f64) * 1000.0).round() / 10.0
    } else {
        0.0
    };

    Ok(AnalyticsSummary {
        total_pickups: row.total_pickups,
        pending_pickups: row.pending_pickups,
        completed_pickups: row.completed_pickups,
        total_reports: row.total_reports,
        open_reports: row.open_reports,
        cleared_reports: row.cleared_reports,
        resolution_rate_percent,
        collected_weight_today_kg: row.collected_weight_today_kg,
        active_vehicles: row.active_vehicles,
        recyclable_open_kg: row.recyclable_open_kg,
    })
}
