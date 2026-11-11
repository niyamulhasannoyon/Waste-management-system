use axum::{
    extract::{Query, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use uuid::Uuid;

use crate::{
    auth::resolve_auth,
    db::{
        generate_tracking_code, normalize_bd_phone, resolve_zone_and_coords, AppState,
    },
    error::AppError,
    models::pickup::{
        CreatePickupRequest, ListPickupsQuery, ListPickupsResponse, PickupRequestRecord,
    },
};

const PICKUP_SELECT_BASE: &str = r#"
    SELECT
        pr.id,
        pr.tracking_code,
        pr.user_id,
        pr.ward_id,
        sz.code AS ward_code,
        sz.name_en AS ward_name_en,
        sz.name_bn AS ward_name_bn,
        pr.assigned_worker_id,
        pr.citizen_phone,
        pr.address,
        pr.waste_category,
        pr.scheduled_time,
        pr.weight_kg,
        pr.status,
        ST_Y(pr.location::geometry) AS lat,
        ST_X(pr.location::geometry) AS lng,
        pr.notes,
        pr.completion_photo_url,
        pr.completed_at,
        pr.created_at,
        pr.updated_at
    FROM pickup_requests pr
    JOIN service_zones sz ON sz.id = pr.ward_id
"#;

/// `POST /api/v1/pickups`
/// Create a household waste pickup request with automatic Savar ward polygon resolution.
pub async fn create_pickup(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<CreatePickupRequest>,
) -> Result<(StatusCode, Json<PickupRequestRecord>), AppError> {
    let auth_user = resolve_auth(&state, &headers).await?;

    let raw_phone = match payload.citizen_phone.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
        Some(p) => p.to_string(),
        None => auth_user
            .as_ref()
            .map(|u| u.phone.clone())
            .ok_or_else(|| {
                AppError::validation(
                    "MISSING_PHONE",
                    "citizen_phone is required when not authenticated.",
                )
            })?,
    };
    let phone = normalize_bd_phone(&raw_phone)?;

    let address = payload.address.trim();
    if address.len() < 4 || address.len() > 500 {
        return Err(AppError::validation(
            "INVALID_ADDRESS",
            "Pickup address must be between 4 and 500 characters.",
        ));
    }

    if let Some(weight) = payload.weight_kg {
        if !weight.is_finite() || weight <= 0.0 || weight > 5000.0 {
            return Err(AppError::validation(
                "INVALID_WEIGHT",
                "weight_kg must be greater than 0 and at most 5000 kg.",
            ));
        }
    }

    let (ward_id, lat, lng) = resolve_zone_and_coords(
        &state.pool,
        payload.ward_id,
        payload.lat,
        payload.lng,
    )
    .await?;

    let id = Uuid::new_v4();
    let tracking_code = generate_tracking_code("CS-PK", id);
    let user_id = auth_user.as_ref().map(|u| u.user_id);

    sqlx::query(
        r#"
        INSERT INTO pickup_requests (
            id, tracking_code, user_id, ward_id, citizen_phone,
            address, waste_category, scheduled_time, weight_kg,
            status, location, notes
        )
        VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9,
            'pending', ST_SetSRID(ST_MakePoint($10, $11), 4326)::geography, $12
        )
        "#,
    )
    .bind(id)
    .bind(&tracking_code)
    .bind(user_id)
    .bind(ward_id)
    .bind(&phone)
    .bind(address)
    .bind(payload.waste_category)
    .bind(payload.scheduled_time)
    .bind(payload.weight_kg)
    .bind(lng)
    .bind(lat)
    .bind(payload.notes.trim())
    .execute(&state.pool)
    .await?;

    let select_sql = format!("{PICKUP_SELECT_BASE} WHERE pr.id = $1");
    let created = sqlx::query_as::<_, PickupRequestRecord>(&select_sql)
        .bind(id)
        .fetch_one(&state.pool)
        .await?;

    Ok((StatusCode::CREATED, Json(created)))
}

/// `GET /api/v1/pickups`
/// List household waste pickup requests with ward, status, waste_category, and phone filtering.
pub async fn list_pickups(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<ListPickupsQuery>,
) -> Result<Json<ListPickupsResponse>, AppError> {
    let _auth_user = resolve_auth(&state, &headers).await?;

    let limit = query.limit.unwrap_or(20).clamp(1, 100);
    let offset = query.offset.unwrap_or(0).max(0);
    let phone_filter = query
        .phone
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(normalize_bd_phone)
        .transpose()?;

    let total: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM pickup_requests pr
        WHERE ($1::INTEGER IS NULL OR pr.ward_id = $1)
          AND ($2::pickup_status IS NULL OR pr.status = $2)
          AND ($3::waste_category IS NULL OR pr.waste_category = $3)
          AND ($4::TEXT IS NULL OR pr.citizen_phone = $4)
        "#,
    )
    .bind(query.ward_id)
    .bind(query.status)
    .bind(query.waste_category)
    .bind(&phone_filter)
    .fetch_one(&state.pool)
    .await?;

    let list_sql = format!(
        "{PICKUP_SELECT_BASE}
         WHERE ($1::INTEGER IS NULL OR pr.ward_id = $1)
           AND ($2::pickup_status IS NULL OR pr.status = $2)
           AND ($3::waste_category IS NULL OR pr.waste_category = $3)
           AND ($4::TEXT IS NULL OR pr.citizen_phone = $4)
         ORDER BY pr.scheduled_time ASC, pr.created_at DESC
         LIMIT $5 OFFSET $6"
    );

    let items = sqlx::query_as::<_, PickupRequestRecord>(&list_sql)
        .bind(query.ward_id)
        .bind(query.status)
        .bind(query.waste_category)
        .bind(&phone_filter)
        .bind(limit)
        .bind(offset)
        .fetch_all(&state.pool)
        .await?;

    Ok(Json(ListPickupsResponse {
        items,
        total,
        limit,
        offset,
    }))
}
