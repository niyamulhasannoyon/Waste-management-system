use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    Json,
};
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

use crate::{
    auth::{extract_client_ip, require_role, Role},
    db::{
        create_notification, record_audit_log, release_vehicle_if_idle, validate_coords, AppState,
    },
    error::{AppError, ErrorBody},
    models::dump_report::{
        AdminMessageRequest, CollectorVehicleRecord, CreateCollectorVehicleRequest,
        DispatchAssignRequest, DispatchAssignResponse, UpdateCollectorVehicleRequest,
        UpdateVehicleLocationRequest,
    },
};

#[derive(Debug, Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct ListVehiclesQuery {
    pub lat: Option<f64>,
    pub lng: Option<f64>,
    pub ward_id: Option<i16>,
    pub status: Option<String>,
    pub radius_m: Option<f64>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct NearbyVehiclesResponse {
    pub target_lat: f64,
    pub target_lng: f64,
    pub radius_meters: f64,
    pub count: usize,
    pub vehicles: Vec<CollectorVehicleRecord>,
}

/// `GET /api/v1/dispatch/vehicles`
/// Admin/Collector endpoint to inspect fleet vehicles with optional spatial proximity & pagination.
#[utoipa::path(
    get,
    path = "/api/v1/dispatch/vehicles",
    tag = "Dispatch",
    security(("bearerAuth" = [])),
    params(ListVehiclesQuery),
    responses(
        (status = 200, description = "Scoped fleet vehicles", body = Vec<CollectorVehicleRecord>),
        (status = 403, description = "Forbidden", body = ErrorBody)
    )
)]
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
#[utoipa::path(
    get,
    path = "/api/v1/workers/nearby",
    tag = "Dispatch",
    security(("bearerAuth" = [])),
    params(ListVehiclesQuery),
    responses(
        (status = 200, description = "Nearby vehicles sorted by distance", body = NearbyVehiclesResponse),
        (status = 400, description = "Missing coordinates", body = ErrorBody)
    )
)]
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
#[utoipa::path(
    patch,
    path = "/api/v1/dispatch/vehicles/{id}/location",
    tag = "Dispatch",
    security(("bearerAuth" = [])),
    params(("id" = Uuid, Path, description = "Vehicle UUID")),
    request_body = UpdateVehicleLocationRequest,
    responses(
        (status = 200, description = "Updated vehicle GPS ping", body = CollectorVehicleRecord),
        (status = 403, description = "Forbidden", body = ErrorBody)
    )
)]
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
        if !matches!(
            status.as_str(),
            "available" | "en_route" | "busy" | "offline"
        ) {
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
#[utoipa::path(
    post,
    path = "/api/v1/dispatch/assign",
    tag = "Dispatch",
    security(("bearerAuth" = [])),
    request_body = DispatchAssignRequest,
    responses(
        (status = 200, description = "Vehicle assigned to pickup or report", body = DispatchAssignResponse),
        (status = 409, description = "No available vehicle in range", body = ErrorBody)
    )
)]
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
        id: Uuid,
        tracking_code: String,
        status: String,
        user_id: Option<Uuid>,
        previous_vehicle_id: Option<Uuid>,
        lng: f64,
        lat: f64,
    }

    let parsed_uuid = Uuid::parse_str(&payload.entity_id).ok();
    let tracking_code_query = payload
        .tracking_code
        .as_deref()
        .unwrap_or(payload.entity_id.as_str());

    let target = if payload.entity_type == "pickup" {
        sqlx::query_as::<_, TargetRow>(
            r#"
            SELECT
                id, tracking_code, status, user_id,
                assigned_vehicle_id AS previous_vehicle_id,
                ST_X(location) AS lng, ST_Y(location) AS lat
            FROM pickup_requests
            WHERE ($1::uuid IS NOT NULL AND id = $1)
               OR tracking_code = $2
               OR tracking_code = $3
            LIMIT 1
            FOR UPDATE
            "#,
        )
        .bind(parsed_uuid)
        .bind(tracking_code_query)
        .bind(&payload.entity_id)
        .fetch_optional(&mut *tx)
        .await?
    } else {
        sqlx::query_as::<_, TargetRow>(
            r#"
            SELECT
                id, tracking_code, status, user_id,
                assigned_vehicle_id AS previous_vehicle_id,
                ST_X(location) AS lng, ST_Y(location) AS lat
            FROM dump_reports
            WHERE ($1::uuid IS NOT NULL AND id = $1)
               OR tracking_code = $2
               OR tracking_code = $3
            LIMIT 1
            FOR UPDATE
            "#,
        )
        .bind(parsed_uuid)
        .bind(tracking_code_query)
        .bind(&payload.entity_id)
        .fetch_optional(&mut *tx)
        .await?
    }
    .ok_or_else(|| AppError::not_found("Target item not found.", "অনুরোধটি খুঁজে পাওয়া যায়নি।"))?;

    let is_assignable = if payload.entity_type == "pickup" {
        matches!(target.status.as_str(), "pending" | "assigned" | "in_progress")
    } else {
        matches!(
            target.status.as_str(),
            "reported" | "verified" | "dispatched"
        )
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
        driver_name_bn: String,
        driver_phone: String,
        status: String,
        user_id: Option<Uuid>,
    }

    let vehicle_candidate = if let Some(ref v_id_or_code) = payload.vehicle_id {
        let v_uuid = Uuid::parse_str(v_id_or_code).ok();
        sqlx::query_as::<_, SelectedVehicle>(
            r#"
            SELECT id, code, driver_name_bn, driver_phone, status, user_id
            FROM collector_vehicles
            WHERE ($1::uuid IS NOT NULL AND id = $1) OR code = $2
            LIMIT 1
            FOR UPDATE
            "#,
        )
        .bind(v_uuid)
        .bind(v_id_or_code)
        .fetch_optional(&mut *tx)
        .await?
    } else {
        None
    };

    let vehicle = match vehicle_candidate {
        Some(v) => {
            if matches!(v.status.as_str(), "offline") {
                return Err(AppError::conflict(
                    "Selected vehicle is offline.",
                    "নির্বাচিত গাড়িটি বর্তমানে অফলাইনে রয়েছে।",
                ));
            }
            v
        }
        None => {
            // Find nearest active vehicle or first available in the municipality
            sqlx::query_as::<_, SelectedVehicle>(
                r#"
                SELECT id, code, driver_name_bn, driver_phone, status, user_id
                FROM collector_vehicles
                WHERE status IN ('available', 'active', 'en_route')
                ORDER BY
                    CASE WHEN status IN ('available', 'active') THEN 0 ELSE 1 END ASC,
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
            .ok_or_else(|| {
                AppError::not_found(
                    "No active collector vehicle found.",
                    "সক্রিয় কোনো সংগ্রহ গাড়ি পাওয়া যায়নি।",
                )
            })?
        }
    };

    let new_status = if payload.entity_type == "pickup" {
        "assigned"
    } else {
        "dispatched"
    };

    let note_to_save = if payload.note_bn.trim().is_empty() {
        format!("সাভার পৌর কন্ট্রোল থেকে গাড়ি {} নির্ধারিত হয়েছে", vehicle.code)
    } else {
        payload.note_bn.trim().to_string()
    };

    if payload.entity_type == "pickup" {
        sqlx::query(
            r#"
            UPDATE pickup_requests
            SET assigned_vehicle_id = $2,
                assigned_vehicle_code = $3,
                collector_name = $4,
                collector_phone = $5,
                admin_note = $6,
                status = $7,
                updated_at = NOW()
            WHERE id = $1
            "#,
        )
        .bind(target.id)
        .bind(vehicle.id)
        .bind(&vehicle.code)
        .bind(&vehicle.driver_name_bn)
        .bind(&vehicle.driver_phone)
        .bind(&note_to_save)
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
        .bind(target.id)
        .bind(&target.status)
        .bind(new_status)
        .bind(admin.user_id)
        .bind(admin.display_label())
        .bind(dispatch_note(&note_to_save, &vehicle.code))
        .execute(&mut *tx)
        .await?;
    } else {
        sqlx::query(
            r#"
            UPDATE dump_reports
            SET assigned_vehicle_id = $2,
                assigned_vehicle_code = $3,
                collector_name = $4,
                collector_phone = $5,
                admin_note = $6,
                status = $7,
                updated_at = NOW()
            WHERE id = $1
            "#,
        )
        .bind(target.id)
        .bind(vehicle.id)
        .bind(&vehicle.code)
        .bind(&vehicle.driver_name_bn)
        .bind(&vehicle.driver_phone)
        .bind(&note_to_save)
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
        .bind(target.id)
        .bind(&target.status)
        .bind(new_status)
        .bind(admin.user_id)
        .bind(admin.display_label())
        .bind(dispatch_note(&note_to_save, &vehicle.code))
        .execute(&mut *tx)
        .await?;
    }

    // Set newly assigned vehicle en_route, and release old vehicle if replaced.
    sqlx::query(
        "UPDATE collector_vehicles SET status = 'en_route', updated_at = NOW() WHERE id = $1 AND status IN ('available', 'active')",
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
        target.id,
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
        target.id,
    )
    .await?;

    record_audit_log(
        &mut *tx,
        Some(admin.user_id),
        Some(admin.role.as_str()),
        "dispatch_assigned",
        Some(&payload.entity_type),
        Some(target.id),
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
        entity_id: target.id.to_string(),
        assigned_vehicle_id: Some(vehicle.id),
        assigned_vehicle_code: vehicle.code,
        collector_name: Some(vehicle.driver_name_bn),
        collector_phone: Some(vehicle.driver_phone),
        admin_note: Some(note_to_save),
        new_status: new_status.to_string(),
    }))
}

/// `POST /api/v1/dispatch/vehicles` (Admin only)
/// Create a new Ward Collector and Vehicle record.
pub async fn create_vehicle(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<CreateCollectorVehicleRequest>,
) -> Result<Json<CollectorVehicleRecord>, AppError> {
    let admin = require_role(&state, &headers, &[Role::Admin]).await?;
    let ip = extract_client_ip(&headers);

    let code = payload.code.trim().to_uppercase();
    if code.is_empty() {
        return Err(AppError::validation("Vehicle code is required.", "গাড়ির কোড আবশ্যক।"));
    }
    let driver_name = payload.driver_name_bn.trim();
    if driver_name.is_empty() {
        return Err(AppError::validation("Driver name is required.", "কালেক্টরের নাম আবশ্যক।"));
    }
    let phone = payload.driver_phone.trim();
    if phone.is_empty() {
        return Err(AppError::validation("Phone number is required.", "মোবাইল নম্বর আবশ্যক।"));
    }

    #[derive(sqlx::FromRow)]
    struct WardCentroid {
        centroid_lat: f64,
        centroid_lng: f64,
        name_bn: String,
    }
    let ward = sqlx::query_as::<_, WardCentroid>(
        "SELECT centroid_lat, centroid_lng, name_bn FROM wards WHERE id = $1",
    )
    .bind(payload.ward_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::not_found("Ward not found.", "ওয়ার্ডটি পাওয়া যায়নি।"))?;

    let v_status = if payload.status == "active" { "available" } else { payload.status.as_str() };

    let created = sqlx::query_as::<_, CollectorVehicleRecord>(
        r#"
        INSERT INTO collector_vehicles (
            code, vehicle_type, driver_name_bn, driver_phone, ward_id,
            current_location, status, last_ping_at, created_at, updated_at
        )
        VALUES (
            $1, $2, $3, $4, $5,
            ST_SetSRID(ST_MakePoint($7, $6), 4326),
            $8, NOW(), NOW(), NOW()
        )
        RETURNING
            id, user_id, code, vehicle_type, driver_name_bn, driver_phone, ward_id,
            $9::TEXT AS ward_name_bn,
            ST_Y(current_location) AS lat,
            ST_X(current_location) AS lng,
            status,
            NULL::DOUBLE PRECISION AS distance_meters,
            last_ping_at
        "#,
    )
    .bind(&code)
    .bind(&payload.vehicle_type)
    .bind(driver_name)
    .bind(phone)
    .bind(payload.ward_id)
    .bind(ward.centroid_lat)
    .bind(ward.centroid_lng)
    .bind(v_status)
    .bind(&ward.name_bn)
    .fetch_one(&state.pool)
    .await?;

    // Ensure Porichonnota Kormi user account is recorded and linked in users table
    let _ = sqlx::query(
        r#"
        INSERT INTO users (phone, full_name, role, ward_id, is_verified)
        VALUES ($1, $2, 'collector', $3, TRUE)
        ON CONFLICT (phone) DO UPDATE
        SET role = 'collector', ward_id = EXCLUDED.ward_id, updated_at = NOW()
        "#,
    )
    .bind(phone)
    .bind(driver_name)
    .bind(payload.ward_id)
    .execute(&state.pool)
    .await;

    let _ = sqlx::query(
        "UPDATE collector_vehicles SET user_id = (SELECT id FROM users WHERE phone = $1 LIMIT 1) WHERE id = $2 AND user_id IS NULL"
    )
    .bind(phone)
    .bind(created.id)
    .execute(&state.pool)
    .await;

    record_audit_log(
        &state.pool,
        Some(admin.user_id),
        Some(admin.role.as_str()),
        "collector_vehicle_created",
        Some("collector_vehicle"),
        Some(created.id),
        Some(&ip),
        serde_json::json!({
            "code": code,
            "driver_name": driver_name,
            "driver_phone": phone,
            "ward_id": payload.ward_id,
        }),
    )
    .await?;

    Ok(Json(created))
}

/// `PATCH /api/v1/dispatch/vehicles/:id` (Admin only)
/// Update a Ward Collector and Vehicle record.
pub async fn update_vehicle(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(payload): Json<UpdateCollectorVehicleRequest>,
) -> Result<Json<CollectorVehicleRecord>, AppError> {
    let admin = require_role(&state, &headers, &[Role::Admin]).await?;
    let ip = extract_client_ip(&headers);

    let v_status = payload.status.as_ref().map(|s| {
        if s == "active" { "available" } else { s.as_str() }
    });

    let updated = sqlx::query_as::<_, CollectorVehicleRecord>(
        r#"
        UPDATE collector_vehicles cv
        SET code = COALESCE($2, cv.code),
            vehicle_type = COALESCE($3, cv.vehicle_type),
            driver_name_bn = COALESCE($4, cv.driver_name_bn),
            driver_phone = COALESCE($5, cv.driver_phone),
            ward_id = COALESCE($6, cv.ward_id),
            status = COALESCE($7, cv.status),
            updated_at = NOW()
        FROM wards w
        WHERE cv.id = $1 AND w.id = COALESCE($6, cv.ward_id)
        RETURNING
            cv.id, cv.user_id, cv.code, cv.vehicle_type, cv.driver_name_bn, cv.driver_phone,
            cv.ward_id, w.name_bn AS ward_name_bn,
            ST_Y(cv.current_location) AS lat, ST_X(cv.current_location) AS lng,
            cv.status, NULL::DOUBLE PRECISION AS distance_meters, cv.last_ping_at
        "#,
    )
    .bind(id)
    .bind(payload.code.as_ref().map(|s| s.trim().to_uppercase()))
    .bind(payload.vehicle_type)
    .bind(payload.driver_name_bn.as_ref().map(|s| s.trim()))
    .bind(payload.driver_phone.as_ref().map(|s| s.trim()))
    .bind(payload.ward_id)
    .bind(v_status)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::not_found("Vehicle not found.", "গাড়িটি খুঁজে পাওয়া যায়নি।"))?;

    // Synchronize Porichonnota Kormi profile in users table
    let _ = sqlx::query(
        r#"
        INSERT INTO users (phone, full_name, role, ward_id, is_verified)
        VALUES ($1, $2, 'collector', $3, TRUE)
        ON CONFLICT (phone) DO UPDATE
        SET full_name = EXCLUDED.full_name,
            role = 'collector',
            ward_id = EXCLUDED.ward_id,
            updated_at = NOW()
        "#,
    )
    .bind(&updated.driver_phone)
    .bind(&updated.driver_name_bn)
    .bind(updated.ward_id)
    .execute(&state.pool)
    .await;

    record_audit_log(
        &state.pool,
        Some(admin.user_id),
        Some(admin.role.as_str()),
        "collector_vehicle_updated",
        Some("collector_vehicle"),
        Some(id),
        Some(&ip),
        serde_json::json!({
            "code": updated.code,
            "status": updated.status,
        }),
    )
    .await?;

    Ok(Json(updated))
}

/// `POST /api/v1/admin/message` (Admin only)
/// Persist an official admin message or response to a citizen pickup or dump report.
pub async fn send_admin_message(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<AdminMessageRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let admin = require_role(&state, &headers, &[Role::Admin]).await?;
    let ip = extract_client_ip(&headers);

    let msg = payload.message_bn.trim();
    if msg.is_empty() {
        return Err(AppError::validation("Message cannot be empty.", "বার্তার বিবরণ দিন।"));
    }

    let parsed_uuid = payload.entity_id.as_deref().and_then(|s| Uuid::parse_str(s).ok());
    let code_candidate = payload.tracking_code.as_deref().or(payload.entity_id.as_deref()).unwrap_or("");

    let mut tx = state.pool.begin().await?;

    if payload.entity_type == "pickup" {
        #[derive(sqlx::FromRow)]
        struct TargetPickup {
            id: Uuid,
            tracking_code: String,
            user_id: Option<Uuid>,
            status: String,
        }

        let target = sqlx::query_as::<_, TargetPickup>(
            r#"
            SELECT id, tracking_code, user_id, status
            FROM pickup_requests
            WHERE ($1::uuid IS NOT NULL AND id = $1) OR tracking_code = $2
            LIMIT 1
            FOR UPDATE
            "#
        )
        .bind(parsed_uuid)
        .bind(code_candidate)
        .fetch_optional(&mut *tx)
        .await?
        .ok_or_else(|| AppError::not_found("Pickup not found.", "পিকআপ অনুরোধটি পাওয়া যায়নি।"))?;

        sqlx::query(
            "UPDATE pickup_requests SET admin_note = $2, updated_at = NOW() WHERE id = $1"
        )
        .bind(target.id)
        .bind(msg)
        .execute(&mut *tx)
        .await?;

        sqlx::query(
            r#"
            INSERT INTO status_events (
                entity_type, entity_id, pickup_id, from_status, to_status,
                actor_user_id, actor_label, note_bn
            )
            VALUES ('pickup', $1, $1, $2, $2, $3, $4, $5)
            "#
        )
        .bind(target.id)
        .bind(&target.status)
        .bind(admin.user_id)
        .bind(admin.display_label())
        .bind(msg)
        .execute(&mut *tx)
        .await?;

        create_notification(
            &mut tx,
            target.user_id,
            "পৌরসভা থেকে বার্তা",
            msg,
            "pickup",
            target.id,
        )
        .await?;

        record_audit_log(
            &mut *tx,
            Some(admin.user_id),
            Some(admin.role.as_str()),
            "admin_message_sent",
            Some("pickup"),
            Some(target.id),
            Some(&ip),
            serde_json::json!({
                "tracking_code": target.tracking_code,
                "message": msg,
            }),
        )
        .await?;
    } else {
        #[derive(sqlx::FromRow)]
        struct TargetReport {
            id: Uuid,
            tracking_code: String,
            user_id: Option<Uuid>,
            status: String,
        }

        let target = sqlx::query_as::<_, TargetReport>(
            r#"
            SELECT id, tracking_code, user_id, status
            FROM dump_reports
            WHERE ($1::uuid IS NOT NULL AND id = $1) OR tracking_code = $2
            LIMIT 1
            FOR UPDATE
            "#
        )
        .bind(parsed_uuid)
        .bind(code_candidate)
        .fetch_optional(&mut *tx)
        .await?
        .ok_or_else(|| AppError::not_found("Report not found.", "অভিযোগটি পাওয়া যায়নি।"))?;

        sqlx::query(
            "UPDATE dump_reports SET admin_note = $2, updated_at = NOW() WHERE id = $1"
        )
        .bind(target.id)
        .bind(msg)
        .execute(&mut *tx)
        .await?;

        sqlx::query(
            r#"
            INSERT INTO status_events (
                entity_type, entity_id, dump_report_id, from_status, to_status,
                actor_user_id, actor_label, note_bn
            )
            VALUES ('dump_report', $1, $1, $2, $2, $3, $4, $5)
            "#
        )
        .bind(target.id)
        .bind(&target.status)
        .bind(admin.user_id)
        .bind(admin.display_label())
        .bind(msg)
        .execute(&mut *tx)
        .await?;

        create_notification(
            &mut tx,
            target.user_id,
            "পৌরসভা থেকে বার্তা",
            msg,
            "dump_report",
            target.id,
        )
        .await?;

        record_audit_log(
            &mut *tx,
            Some(admin.user_id),
            Some(admin.role.as_str()),
            "admin_message_sent",
            Some("dump_report"),
            Some(target.id),
            Some(&ip),
            serde_json::json!({
                "tracking_code": target.tracking_code,
                "message": msg,
            }),
        )
        .await?;
    }

    tx.commit().await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "message_bn": "বার্তা সফলভাবে নাগরিককে পাঠানো হয়েছে।"
    })))
}

fn dispatch_note(raw: &str, vehicle_code: &str) -> String {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        format!("গাড়ি {vehicle_code} পাঠানো হয়েছে")
    } else {
        trimmed.to_string()
    }
}
