use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    auth::{extract_client_ip, require_role, Role},
    db::{create_notification, record_audit_log, release_vehicle_if_idle, validate_coords, AppState},
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
    pub status: Option<String>,
    pub radius_m: Option<f64>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct NearbyVehiclesResponse {
    pub target_lat: f64,
    pub target_lng: f64,
    pub radius_meters: f64,
    pub count: usize,
    pub vehicles: Vec<CollectorVehicleRecord>,
}

/// `GET /api/v1/dispatch/vehicles`
/// Admin/Collector endpoint to inspect fleet vehicles with optional spatial proximity & pagination.
pub async fn list_vehicles(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<ListVehiclesQuery>,
) -> Result<Json<Vec<CollectorVehicleRecord>>, AppError> {
    let auth_user = require_role(&state, &headers, &[Role::Collector, Role::Admin]).await?;

    match (query.lat, query.lng) {
        (Some(lat), Some(lng)) => validate_coords(lat, lng)?,
        (Some(_), None) | (None, Some(_)) => {
            return Err(AppError::validation(
                "Both lat and lng must be provided together.",
                "অবস্থান দিয়ে খুঁজতে হলে lat এবং lng একসাথে দিন।",
            ));
        }
        (None, None) => {}
    }
    if let Some(ref st) = query.status {
        if !matches!(st.as_str(), "available" | "en_route" | "busy" | "offline") {
            return Err(AppError::validation(
                "Invalid vehicle status filter.",
                "গাড়ির স্ট্যাটাস ফিল্টার সঠিক নয়।",
            ));
        }
    }

    let limit = query.limit.unwrap_or(50).clamp(1, 100);
    let page = query.page.unwrap_or(1).max(1);
    let offset = (page - 1) * limit;

    let collector_vehicle_id: Option<Uuid> = if auth_user.role == Role::Collector {
        Some(auth_user.vehicle_id.ok_or_else(|| {
            AppError::forbidden(
                "Collector account has no linked vehicle.",
                "আপনার কালেক্টর অ্যাকাউন্টে কোনো গাড়ি সংযুক্ত নেই।",
            )
        })?)
    } else {
        None
    };

    let vehicles = sqlx::query_as::<_, CollectorVehicleRecord>(
        r#"
        SELECT
            cv.id,
            cv.user_id,
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
          AND ($4::TEXT IS NULL OR cv.status = $4)
          AND ($5::UUID IS NULL OR cv.id = $5)
        ORDER BY
            CASE WHEN cv.status = 'available' THEN 0 WHEN cv.status = 'en_route' THEN 1 ELSE 2 END ASC,
            distance_meters ASC NULLS LAST,
            cv.code ASC
        LIMIT $6 OFFSET $7
        "#,
    )
    .bind(query.lat)
    .bind(query.lng)
    .bind(query.ward_id)
    .bind(query.status)
    .bind(collector_vehicle_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(vehicles))
}

/// `GET /api/v1/workers/nearby`
/// Admin dispatch endpoint to find active nearby collector vehicles within radius_m sorted by PostGIS ST_Distance.
pub async fn nearby_workers(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<ListVehiclesQuery>,
) -> Result<Json<NearbyVehiclesResponse>, AppError> {
    let _admin = require_role(&state, &headers, &[Role::Admin]).await?;

    let (lat, lng) = match (query.lat, query.lng) {
        (Some(lat), Some(lng)) => {
            validate_coords(lat, lng)?;
            (lat, lng)
        }
        _ => {
            return Err(AppError::validation(
                "Both lat and lng are required.",
                "নিকটবর্তী গাড়ি খুঁজতে lat ও lng দিন।",
            ));
        }
    };

    let radius_meters = query
        .radius_m
        .filter(|r| r.is_finite())
        .unwrap_or(state.nearby_default_radius_meters)
        .clamp(50.0, 50_000.0);
    let limit = query.limit.unwrap_or(5).clamp(1, 20);

    let vehicles = sqlx::query_as::<_, CollectorVehicleRecord>(
        r#"
        SELECT
            cv.id,
            cv.user_id,
            cv.code,
            cv.vehicle_type,
            cv.driver_name_bn,
            cv.driver_phone,
            cv.ward_id,
            w.name_bn AS ward_name_bn,
            ST_Y(cv.current_location) AS lat,
            ST_X(cv.current_location) AS lng,
            cv.status,
            ST_Distance(
                cv.current_location::geography,
                ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
            ) AS distance_meters,
            cv.last_ping_at
        FROM collector_vehicles cv
        JOIN wards w ON w.id = cv.ward_id
        WHERE cv.status != 'offline'
          AND ST_DWithin(
                cv.current_location::geography,
                ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
                $3
              )
        ORDER BY distance_meters ASC
        LIMIT $4
        "#,
    )
    .bind(lng)
    .bind(lat)
    .bind(radius_meters)
    .bind(limit)
    .fetch_all(&state.pool)
    .await?;

    let count = vehicles.len();
    Ok(Json(NearbyVehiclesResponse {
        target_lat: lat,
        target_lng: lng,
        radius_meters,
        count,
        vehicles,
    }))
}

/// `PATCH /api/v1/dispatch/vehicles/:id/location`
/// Collectors can only update their own vehicle GPS/status; Admins can update any vehicle.
pub async fn update_vehicle_location(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateVehicleLocationRequest>,
) -> Result<Json<CollectorVehicleRecord>, AppError> {
    let auth_user = require_role(&state, &headers, &[Role::Collector, Role::Admin]).await?;
    validate_coords(payload.lat, payload.lng)?;

    if auth_user.role == Role::Collector && auth_user.vehicle_id != Some(id) {
        return Err(AppError::forbidden(
            "Collectors can only update location for their own assigned vehicle.",
            "কালেক্টর কেবল নিজের গাড়ির অবস্থান আপডেট করতে পারবেন।",
        ));
    }

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
            last_ping_at = NOW(),
            updated_at = NOW()
        FROM wards w
        WHERE cv.id = $4 AND w.id = cv.ward_id
        RETURNING
            cv.id,
            cv.user_id,
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

/// `POST /api/v1/dispatch/assign` (Admin only)
/// Safely assigns/reassigns an active vehicle to an active pickup or report and releases replaced vehicles.
pub async fn assign_vehicle(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<DispatchAssignRequest>,
) -> Result<Json<DispatchAssignResponse>, AppError> {
    let admin = require_role(&state, &headers, &[Role::Admin]).await?;
    let ip = extract_client_ip(&headers);

    if !matches!(payload.entity_type.as_str(), "pickup" | "dump_report") {
        return Err(AppError::validation(
            "entity_type must be 'pickup' or 'dump_report'.",
            "সঠিক কাজের ধরন নির্বাচন করুন।",
        ));
    }

    if payload.note_bn.trim().chars().count() > 500 {
        return Err(AppError::validation(
            "Dispatch note cannot exceed 500 characters.",
            "নির্দেশনা ৫০০ অক্ষরের বেশি হওয়া যাবে না।",
        ));
    }

    let mut tx = state.pool.begin().await?;

    #[derive(sqlx::FromRow)]
    struct TargetRow {
        tracking_code: String,
        status: String,
        user_id: Option<Uuid>,
        previous_vehicle_id: Option<Uuid>,
        lng: f64,
        lat: f64,
    }

    let target = if payload.entity_type == "pickup" {
        sqlx::query_as::<_, TargetRow>(
            "SELECT tracking_code, status, user_id, assigned_vehicle_id AS previous_vehicle_id, ST_X(location) AS lng, ST_Y(location) AS lat FROM pickup_requests WHERE id = $1 FOR UPDATE",
        )
        .bind(payload.entity_id)
        .fetch_optional(&mut *tx)
        .await?
    } else {
        sqlx::query_as::<_, TargetRow>(
            "SELECT tracking_code, status, user_id, assigned_vehicle_id AS previous_vehicle_id, ST_X(location) AS lng, ST_Y(location) AS lat FROM dump_reports WHERE id = $1 FOR UPDATE",
        )
        .bind(payload.entity_id)
        .fetch_optional(&mut *tx)
        .await?
    }
    .ok_or_else(|| AppError::not_found("Target item not found.", "অনুরোধটি খুঁজে পাওয়া যায়নি।"))?;

    let is_assignable = if payload.entity_type == "pickup" {
        matches!(target.status.as_str(), "pending" | "assigned")
    } else {
        matches!(target.status.as_str(), "reported" | "verified" | "dispatched")
    };

    if !is_assignable {
        return Err(AppError::conflict(
            "Cannot dispatch a vehicle to an already completed or cancelled task.",
            "সম্পন্ন বা বাতিলকৃত কাজে নতুন গাড়ি নির্ধারণ করা যাবে না।",
        ));
    }

    #[derive(sqlx::FromRow)]
    struct SelectedVehicle {
        id: Uuid,
        code: String,
        status: String,
        user_id: Option<Uuid>,
    }

    let vehicle = if let Some(vehicle_id) = payload.vehicle_id {
        let candidate = sqlx::query_as::<_, SelectedVehicle>(
            "SELECT id, code, status, user_id FROM collector_vehicles WHERE id = $1 FOR UPDATE",
        )
        .bind(vehicle_id)
        .fetch_optional(&mut *tx)
        .await?
        .ok_or_else(|| {
            AppError::not_found("Selected vehicle not found.", "নির্বাচিত গাড়িটি পাওয়া যায়নি।")
        })?;

        if matches!(candidate.status.as_str(), "offline" | "busy") {
            return Err(AppError::conflict(
                "Selected vehicle is offline or busy.",
                "নির্বাচিত গাড়িটি বর্তমানে অফলাইন অথবা অন্য জরুরি কাজে ব্যস্ত রয়েছে।",
            ));
        }
        Some(candidate)
    } else {
        sqlx::query_as::<_, SelectedVehicle>(
            r#"
            SELECT id, code, status, user_id
            FROM collector_vehicles
            WHERE status IN ('available', 'en_route')
            ORDER BY
                CASE WHEN status = 'available' THEN 0 ELSE 1 END ASC,
                ST_Distance(
                    current_location::geography,
                    ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
                ) ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED
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

        sqlx::query(
            r#"
            INSERT INTO status_events (
                entity_type, entity_id, pickup_id, from_status, to_status,
                actor_user_id, actor_label, note_bn
            )
            VALUES ('pickup', $1, $1, $2, $3, $4, $5, $6)
            "#,
        )
        .bind(payload.entity_id)
        .bind(&target.status)
        .bind(new_status)
        .bind(admin.user_id)
        .bind(admin.display_label())
        .bind(dispatch_note(&payload.note_bn, &vehicle.code))
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

        sqlx::query(
            r#"
            INSERT INTO status_events (
                entity_type, entity_id, dump_report_id, from_status, to_status,
                actor_user_id, actor_label, note_bn
            )
            VALUES ('dump_report', $1, $1, $2, $3, $4, $5, $6)
            "#,
        )
        .bind(payload.entity_id)
        .bind(&target.status)
        .bind(new_status)
        .bind(admin.user_id)
        .bind(admin.display_label())
        .bind(dispatch_note(&payload.note_bn, &vehicle.code))
        .execute(&mut *tx)
        .await?;
    }

    // Set newly assigned vehicle en_route, and release old vehicle if replaced.
    sqlx::query(
        "UPDATE collector_vehicles SET status = 'en_route', updated_at = NOW() WHERE id = $1 AND status = 'available'",
    )
    .bind(vehicle.id)
    .execute(&mut *tx)
    .await?;

    if target.previous_vehicle_id.is_some() && target.previous_vehicle_id != Some(vehicle.id) {
        release_vehicle_if_idle(&mut tx, target.previous_vehicle_id).await?;
    }

    let citizen_body = format!(
        "আপনার অনুরোধ {} এর জন্য গাড়ি {} পাঠানো হয়েছে।",
        target.tracking_code, vehicle.code
    );
    create_notification(
        &mut tx,
        target.user_id,
        "টিম ও গাড়ি নির্ধারিত হয়েছে",
        &citizen_body,
        &payload.entity_type,
        payload.entity_id,
    )
    .await?;

    let driver_body = format!(
        "নতুন কাজ {} আপনার গাড়ি {} এ নির্ধারিত হয়েছে।",
        target.tracking_code, vehicle.code
    );
    create_notification(
        &mut tx,
        vehicle.user_id,
        "নতুন সংগ্রহ টাস্ক",
        &driver_body,
        &payload.entity_type,
        payload.entity_id,
    )
    .await?;

    record_audit_log(
        &mut *tx,
        Some(admin.user_id),
        Some(admin.role.as_str()),
        "dispatch_assigned",
        Some(&payload.entity_type),
        Some(payload.entity_id),
        Some(&ip),
        serde_json::json!({
            "vehicle_id": vehicle.id,
            "vehicle_code": vehicle.code,
            "tracking_code": target.tracking_code,
            "new_status": new_status,
        }),
    )
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

fn dispatch_note(raw: &str, vehicle_code: &str) -> String {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        format!("গাড়ি {vehicle_code} পাঠানো হয়েছে")
    } else {
        trimmed.to_string()
    }
}
