use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::Serialize;
use uuid::Uuid;

use crate::{
    db::{normalize_bd_phone, resolve_ward_id_by_coords, validate_coords, AppState},
    error::AppError,
    models::{
        partner::StatusEventRecord,
        pickup::{
            CreatePickupRequest, ListPickupsQuery, PickupRequestRecord, UpdatePickupStatusRequest,
        },
    },
};

const PICKUP_SELECT_BASE: &str = r#"
    SELECT
        pr.id,
        pr.tracking_code,
        pr.citizen_name,
        pr.citizen_phone,
        pr.ward_id,
        w.name_bn AS ward_name_bn,
        pr.address_line,
        pr.landmark,
        pr.waste_type,
        pr.slot,
        pr.estimated_bags,
        pr.status,
        ST_Y(pr.location) AS lat,
        ST_X(pr.location) AS lng,
        pr.assigned_vehicle_id,
        cv.code AS assigned_vehicle_code,
        pr.notes,
        pr.created_at,
        pr.updated_at
    FROM pickup_requests pr
    JOIN wards w ON w.id = pr.ward_id
    LEFT JOIN collector_vehicles cv ON cv.id = pr.assigned_vehicle_id
"#;

const VALID_WASTE_TYPES: &[&str] = &["household", "organic", "recyclable", "bulky"];
const VALID_SLOTS: &[&str] = &["morning", "afternoon", "evening"];
const VALID_PICKUP_STATUSES: &[&str] =
    &["pending", "assigned", "in_progress", "collected", "cancelled"];

#[derive(Serialize)]
pub struct TrackedPickupResponse {
    pub pickup: PickupRequestRecord,
    pub events: Vec<StatusEventRecord>,
}

pub async fn list_pickups(
    State(state): State<AppState>,
    Query(query): Query<ListPickupsQuery>,
) -> Result<Json<Vec<PickupRequestRecord>>, AppError> {
    let limit = query.limit.unwrap_or(50).clamp(1, 200);
    let phone_filter = query
        .phone
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(normalize_bd_phone)
        .transpose()?;

    let sql = format!(
        "{PICKUP_SELECT_BASE}
         WHERE ($1::SMALLINT IS NULL OR pr.ward_id = $1)
           AND ($2::TEXT IS NULL OR pr.status = $2)
           AND ($3::TEXT IS NULL OR pr.citizen_phone = $3)
         ORDER BY pr.created_at DESC
         LIMIT $4"
    );

    let rows = sqlx::query_as::<_, PickupRequestRecord>(&sql)
        .bind(query.ward_id)
        .bind(query.status)
        .bind(phone_filter)
        .bind(limit)
        .fetch_all(&state.pool)
        .await?;

    Ok(Json(rows))
}

pub async fn create_pickup(
    State(state): State<AppState>,
    Json(payload): Json<CreatePickupRequest>,
) -> Result<(StatusCode, Json<PickupRequestRecord>), AppError> {
    if payload.citizen_name.trim().is_empty() {
        return Err(AppError::validation(
            "Citizen name is required.",
            "অনুগ্রহ করে আপনার নাম লিখুন।",
        ));
    }
    if payload.address_line.trim().len() < 4 {
        return Err(AppError::validation(
            "Pickup address is too short.",
            "বাড়ি ও রোডের ঠিকানা স্পষ্ট করে লিখুন।",
        ));
    }
    if !VALID_WASTE_TYPES.contains(&payload.waste_type.as_str()) {
        return Err(AppError::validation(
            "Invalid waste_type.",
            "সঠিক ময়লার ধরন নির্বাচন করুন।",
        ));
    }
    if !VALID_SLOTS.contains(&payload.slot.as_str()) {
        return Err(AppError::validation(
            "Invalid pickup slot.",
            "পিকআপের সঠিক সময় নির্বাচন করুন।",
        ));
    }
    if !(1..=50).contains(&payload.estimated_bags) {
        return Err(AppError::validation(
            "estimated_bags must be between 1 and 50.",
            "বস্তার সংখ্যা ১ থেকে ৫০ এর মধ্যে হতে হবে।",
        ));
    }

    let phone = normalize_bd_phone(&payload.citizen_phone)?;

    let (lat, lng, ward_id) = match (payload.lat, payload.lng, payload.ward_id) {
        (Some(lat), Some(lng), explicit_ward) => {
            validate_coords(lat, lng)?;
            let wid = match explicit_ward {
                Some(w) => w,
                None => resolve_ward_id_by_coords(&state.pool, lat, lng).await?,
            };
            (lat, lng, wid)
        }
        (None, None, Some(wid)) => {
            #[derive(sqlx::FromRow)]
            struct Centroid {
                lat: f64,
                lng: f64,
            }
            let c = sqlx::query_as::<_, Centroid>(
                "SELECT ST_Y(centroid) AS lat, ST_X(centroid) AS lng FROM wards WHERE id = $1 AND is_active = TRUE",
            )
            .bind(wid)
            .fetch_optional(&state.pool)
            .await?
            .ok_or_else(|| {
                AppError::validation("Selected Savar ward does not exist.", "সঠিক সাভার ওয়ার্ড নির্বাচন করুন।")
            })?;
            (c.lat, c.lng, wid)
        }
        _ => {
            return Err(AppError::validation(
                "Provide either a Savar ward_id or GPS coordinates (lat, lng).",
                "সাভারের ওয়ার্ড বা লোকেশন পিন দিন।",
            ));
        }
    };

    let id = Uuid::new_v4();
    let suffix = (id.as_u128() % 9000 + 1000) as u16;
    let tracking_code = format!("CS-PK-{suffix}");

    let mut tx = state.pool.begin().await?;

    sqlx::query(
        r#"
        INSERT INTO pickup_requests (
            id, tracking_code, citizen_name, citizen_phone, ward_id,
            address_line, landmark, waste_type, slot, estimated_bags,
            status, location, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', ST_SetSRID(ST_MakePoint($11, $12), 4326), $13)
        "#,
    )
    .bind(id)
    .bind(&tracking_code)
    .bind(payload.citizen_name.trim())
    .bind(&phone)
    .bind(ward_id)
    .bind(payload.address_line.trim())
    .bind(payload.landmark.trim())
    .bind(&payload.waste_type)
    .bind(&payload.slot)
    .bind(payload.estimated_bags)
    .bind(lng)
    .bind(lat)
    .bind(payload.notes.trim())
    .execute(&mut *tx)
    .await?;

    sqlx::query(
        r#"
        INSERT INTO status_events (entity_type, entity_id, from_status, to_status, actor_label, note_bn)
        VALUES ('pickup', $1, NULL, 'pending', $2, 'নাগরিকের পিকআপ রিকোয়েস্ট গ্রহণ করা হয়েছে')
        "#,
    )
    .bind(id)
    .bind(payload.citizen_name.trim())
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    let created = fetch_pickup_by_id(&state, id).await?;
    Ok((StatusCode::CREATED, Json(created)))
}

pub async fn track_by_code(
    State(state): State<AppState>,
    Path(code): Path<String>,
) -> Result<Json<TrackedPickupResponse>, AppError> {
    let normalized_code = code.trim().to_uppercase();
    let sql = format!("{PICKUP_SELECT_BASE} WHERE pr.tracking_code = $1");

    let pickup = sqlx::query_as::<_, PickupRequestRecord>(&sql)
        .bind(&normalized_code)
        .fetch_optional(&state.pool)
        .await?
        .ok_or_else(|| {
            AppError::not_found(
                "Pickup request tracking code not found.",
                "এই ট্র্যাকিং কোডের কোনো পিকআপ রিকোয়েস্ট পাওয়া যায়নি।",
            )
        })?;

    let events = sqlx::query_as::<_, StatusEventRecord>(
        r#"
        SELECT id, entity_type, entity_id, from_status, to_status, actor_label, note_bn, created_at
        FROM status_events
        WHERE entity_type = 'pickup' AND entity_id = $1
        ORDER BY created_at ASC
        "#,
    )
    .bind(pickup.id)
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(TrackedPickupResponse { pickup, events }))
}

pub async fn update_pickup_status(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdatePickupStatusRequest>,
) -> Result<Json<PickupRequestRecord>, AppError> {
    if !VALID_PICKUP_STATUSES.contains(&payload.status.as_str()) {
        return Err(AppError::validation(
            "Invalid pickup status.",
            "পিকআপ স্ট্যাটাসটি সঠিক নয়।",
        ));
    }

    let mut tx = state.pool.begin().await?;

    let previous_status: Option<String> =
        sqlx::query_scalar("SELECT status FROM pickup_requests WHERE id = $1 FOR UPDATE")
            .bind(id)
            .fetch_optional(&mut *tx)
            .await?;

    let from_status = previous_status.ok_or_else(|| {
        AppError::not_found(
            "Pickup request not found.",
            "পিকআপ রিকোয়েস্টটি খুঁজে পাওয়া যায়নি।",
        )
    })?;

    sqlx::query("UPDATE pickup_requests SET status = $2, updated_at = NOW() WHERE id = $1")
        .bind(id)
        .bind(&payload.status)
        .execute(&mut *tx)
        .await?;

    sqlx::query(
        r#"
        INSERT INTO status_events (entity_type, entity_id, from_status, to_status, actor_label, note_bn)
        VALUES ('pickup', $1, $2, $3, $4, $5)
        "#,
    )
    .bind(id)
    .bind(&from_status)
    .bind(&payload.status)
    .bind(payload.actor_label.trim())
    .bind(payload.note_bn.trim())
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(Json(fetch_pickup_by_id(&state, id).await?))
}

async fn fetch_pickup_by_id(state: &AppState, id: Uuid) -> Result<PickupRequestRecord, AppError> {
    let sql = format!("{PICKUP_SELECT_BASE} WHERE pr.id = $1");
    sqlx::query_as::<_, PickupRequestRecord>(&sql)
        .bind(id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or_else(|| AppError::not_found("Pickup request not found.", "পিকআপ রিকোয়েস্ট পাওয়া যায়নি।"))
}
