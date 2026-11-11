use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    db::{validate_coords, AppState},
    error::AppError,
    models::dump_report::{
        CollectorVehicleRecord, DispatchAssignRequest, DispatchAssignResponse,
        UpdateVehicleLocationRequest,
    },
};

#[derive(Debug, Deserialize)]
pub struct ListVehiclesQuery {
    pub lat: Option<f64>,
    pub lng: Option<f64>,
    pub ward_id: Option<i16>,
}

pub async fn list_vehicles(
    State(state): State<AppState>,
    Query(query): Query<ListVehiclesQuery>,
) -> Result<Json<Vec<CollectorVehicleRecord>>, AppError> {
    if let (Some(lat), Some(lng)) = (query.lat, query.lng) {
        validate_coords(lat, lng)?;
    }

    let vehicles = sqlx::query_as::<_, CollectorVehicleRecord>(
        r#"
        SELECT
            cv.id,
            cv.code,
            cv.vehicle_type,
            cv.driver_name_bn,
            cv.driver_phone,
            cv.ward_id,
            w.name_bn AS ward_name_bn,
            ST_Y(cv.current_location) AS lat,
            ST_X(cv.current_location) AS lng,
            cv.status,
            CASE
                WHEN $1::DOUBLE PRECISION IS NOT NULL AND $2::DOUBLE PRECISION IS NOT NULL
                THEN ST_Distance(
                    cv.current_location::geography,
                    ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
                )
                ELSE NULL
            END AS distance_meters,
            cv.last_ping_at
        FROM collector_vehicles cv
        JOIN wards w ON w.id = cv.ward_id
        WHERE ($3::SMALLINT IS NULL OR cv.ward_id = $3)
        ORDER BY
            CASE WHEN cv.status = 'available' THEN 0 WHEN cv.status = 'en_route' THEN 1 ELSE 2 END ASC,
            distance_meters ASC NULLS LAST,
            cv.code ASC
        "#,
    )
    .bind(query.lat)
    .bind(query.lng)
    .bind(query.ward_id)
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(vehicles))
}

pub async fn update_vehicle_location(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateVehicleLocationRequest>,
) -> Result<Json<CollectorVehicleRecord>, AppError> {
    validate_coords(payload.lat, payload.lng)?;

    if let Some(ref status) = payload.status {
        if !matches!(status.as_str(), "available" | "en_route" | "busy" | "offline") {
            return Err(AppError::validation(
                "Invalid vehicle status.",
                "গাড়ির স্ট্যাটাস সঠিক নয়।",
            ));
        }
    }

    let updated = sqlx::query_as::<_, CollectorVehicleRecord>(
        r#"
        UPDATE collector_vehicles cv
        SET current_location = ST_SetSRID(ST_MakePoint($2, $1), 4326),
            status = COALESCE($3, cv.status),
            last_ping_at = NOW()
        FROM wards w
        WHERE cv.id = $4 AND w.id = cv.ward_id
        RETURNING
            cv.id,
            cv.code,
            cv.vehicle_type,
            cv.driver_name_bn,
            cv.driver_phone,
            cv.ward_id,
            w.name_bn AS ward_name_bn,
            ST_Y(cv.current_location) AS lat,
            ST_X(cv.current_location) AS lng,
            cv.status,
            NULL::DOUBLE PRECISION AS distance_meters,
            cv.last_ping_at
        "#,
    )
    .bind(payload.lat)
    .bind(payload.lng)
    .bind(payload.status)
    .bind(id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::not_found("Vehicle not found.", "গাড়িটি খুঁজে পাওয়া যায়নি।"))?;

    Ok(Json(updated))
}

pub async fn assign_vehicle(
    State(state): State<AppState>,
    Json(payload): Json<DispatchAssignRequest>,
) -> Result<Json<DispatchAssignResponse>, AppError> {
    if !matches!(payload.entity_type.as_str(), "pickup" | "dump_report") {
        return Err(AppError::validation(
            "entity_type must be 'pickup' or 'dump_report'.",
            "সঠিক কাজের ধরন নির্বাচন করুন।",
        ));
    }

    let mut tx = state.pool.begin().await?;

    #[derive(sqlx::FromRow)]
    struct TargetPoint {
        status: String,
        lng: f64,
        lat: f64,
    }

    let target = if payload.entity_type == "pickup" {
        sqlx::query_as::<_, TargetPoint>(
            "SELECT status, ST_X(location) AS lng, ST_Y(location) AS lat FROM pickup_requests WHERE id = $1 FOR UPDATE",
        )
        .bind(payload.entity_id)
        .fetch_optional(&mut *tx)
        .await?
    } else {
        sqlx::query_as::<_, TargetPoint>(
            "SELECT status, ST_X(location) AS lng, ST_Y(location) AS lat FROM dump_reports WHERE id = $1 FOR UPDATE",
        )
        .bind(payload.entity_id)
        .fetch_optional(&mut *tx)
        .await?
    }
    .ok_or_else(|| AppError::not_found("Target item not found.", "অনুরোধটি খুঁজে পাওয়া যায়নি।"))?;

    #[derive(sqlx::FromRow)]
    struct SelectedVehicle {
        id: Uuid,
        code: String,
    }

    let vehicle = if let Some(vehicle_id) = payload.vehicle_id {
        sqlx::query_as::<_, SelectedVehicle>(
            "SELECT id, code FROM collector_vehicles WHERE id = $1",
        )
        .bind(vehicle_id)
        .fetch_optional(&mut *tx)
        .await?
    } else {
        sqlx::query_as::<_, SelectedVehicle>(
            r#"
            SELECT id, code
            FROM collector_vehicles
            WHERE status IN ('available', 'en_route')
            ORDER BY
                CASE WHEN status = 'available' THEN 0 ELSE 1 END ASC,
                ST_Distance(
                    current_location::geography,
                    ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
                ) ASC
            LIMIT 1
            "#,
        )
        .bind(target.lng)
        .bind(target.lat)
        .fetch_optional(&mut *tx)
        .await?
    }
    .ok_or_else(|| {
        AppError::not_found(
            "No active collector vehicle found nearby.",
            "নিকটবর্তী কোনো সক্রিয় গাড়ি পাওয়া যায়নি।",
        )
    })?;

    let new_status = if payload.entity_type == "pickup" {
        "assigned"
    } else {
        "dispatched"
    };

    if payload.entity_type == "pickup" {
        sqlx::query(
            "UPDATE pickup_requests SET assigned_vehicle_id = $2, status = $3, updated_at = NOW() WHERE id = $1",
        )
        .bind(payload.entity_id)
        .bind(vehicle.id)
        .bind(new_status)
        .execute(&mut *tx)
        .await?;
    } else {
        sqlx::query(
            "UPDATE dump_reports SET assigned_vehicle_id = $2, status = $3, updated_at = NOW() WHERE id = $1",
        )
        .bind(payload.entity_id)
        .bind(vehicle.id)
        .bind(new_status)
        .execute(&mut *tx)
        .await?;
    }

    sqlx::query(
        "UPDATE collector_vehicles SET status = 'en_route' WHERE id = $1 AND status = 'available'",
    )
    .bind(vehicle.id)
    .execute(&mut *tx)
    .await?;

    let note = if payload.note_bn.trim().is_empty() {
        format!("গাড়ি {} পাঠানো হয়েছে", vehicle.code)
    } else {
        payload.note_bn.trim().to_string()
    };

    sqlx::query(
        r#"
        INSERT INTO status_events (entity_type, entity_id, from_status, to_status, actor_label, note_bn)
        VALUES ($1, $2, $3, $4, 'সাভার পৌরসভা অপস', $5)
        "#,
    )
    .bind(&payload.entity_type)
    .bind(payload.entity_id)
    .bind(&target.status)
    .bind(new_status)
    .bind(&note)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(Json(DispatchAssignResponse {
        entity_type: payload.entity_type,
        entity_id: payload.entity_id,
        assigned_vehicle_id: vehicle.id,
        assigned_vehicle_code: vehicle.code,
        new_status: new_status.to_string(),
    }))
}
