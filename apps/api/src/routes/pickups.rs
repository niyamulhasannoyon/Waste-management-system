use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    auth::{extract_client_ip, extract_optional_auth, require_role, AuthUser, Role},
    db::{
        create_notification, ensure_ward_exists, escape_ilike_pattern, generate_tracking_code,
        mask_phone, normalize_bd_phone, release_vehicle_if_idle, resolve_ward_id_and_match,
        validate_coords, AppState,
    },
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
        pr.user_id,
        pr.citizen_name,
        pr.citizen_phone,
        pr.ward_id,
        w.name_bn AS ward_name_bn,
        pr.address_line,
        pr.landmark,
        pr.waste_type,
        pr.slot,
        pr.schedule_type,
        pr.preferred_day,
        pr.estimated_bags,
        pr.weight_kg,
        pr.status,
        ST_Y(pr.location) AS lat,
        ST_X(pr.location) AS lng,
        pr.assigned_vehicle_id,
        cv.code AS assigned_vehicle_code,
        pr.notes,
        pr.completion_photo_url,
        pr.completed_at,
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
const VALID_DAYS: &[&str] = &[
    "saturday",
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
];

#[derive(Serialize)]
pub struct TrackedPickupResponse {
    pub pickup: PickupRequestRecord,
    pub events: Vec<StatusEventRecord>,
}

#[derive(Debug, Deserialize)]
pub struct TrackVerifyQuery {
    pub phone: Option<String>,
}

/// Validate allowed state transitions for pickup requests.
pub fn is_valid_pickup_transition(from: &str, to: &str) -> bool {
    if from == to {
        return true;
    }
    matches!(
        (from, to),
        ("pending", "assigned" | "in_progress" | "cancelled")
            | ("assigned", "in_progress" | "collected" | "cancelled")
            | ("in_progress", "collected" | "cancelled")
    )
}

/// `GET /api/v1/pickups`
/// Authenticated, role-scoped list endpoint with search and pagination.
pub async fn list_pickups(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<ListPickupsQuery>,
) -> Result<Json<Vec<PickupRequestRecord>>, AppError> {
    let auth_user = require_role(
        &state,
        &headers,
        &[Role::Citizen, Role::Collector, Role::Admin],
    )
    .await?;

    let limit = query.limit.unwrap_or(50).clamp(1, 100);
    let page = query.page.unwrap_or(1).max(1);
    let offset = (page - 1) * limit;

    if let Some(ref st) = query.status {
        if !VALID_PICKUP_STATUSES.contains(&st.as_str()) {
            return Err(AppError::validation(
                "Invalid pickup status filter.",
                "সঠিক স্ট্যাটাস ফিল্টার দিন।",
            ));
        }
    }

    let search = query
        .q
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(|s| format!("%{}%", escape_ilike_pattern(s)));

    let phone_filter = match auth_user.role {
        Role::Citizen => Some(auth_user.phone.clone()),
        Role::Admin => query
            .phone
            .as_deref()
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(normalize_bd_phone)
            .transpose()?,
        Role::Collector | Role::Partner => None,
    };

    let owner_user_id: Option<Uuid> = if auth_user.role == Role::Citizen {
        Some(auth_user.user_id)
    } else {
        None
    };

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

    let effective_ward_id: Option<i16> = query.ward_id;

    let sql = format!(
        "{PICKUP_SELECT_BASE}
         WHERE ($1::SMALLINT IS NULL OR pr.ward_id = $1)
           AND ($2::TEXT IS NULL OR pr.status = $2)
           AND (
               $3::UUID IS NULL
               OR pr.user_id = $3
               OR pr.citizen_phone = $4
           )
           AND (
               $3::UUID IS NOT NULL
               OR $4::TEXT IS NULL
               OR pr.citizen_phone = $4
           )
           AND (
               $5::UUID IS NULL
               OR pr.assigned_vehicle_id = $5
               OR (
                   pr.assigned_vehicle_id IS NULL
                   AND EXISTS (
                       SELECT 1 FROM collector_vehicles cv
                       WHERE cv.id = $5 AND cv.ward_id = pr.ward_id
                   )
               )
           )
           AND (
               $6::TEXT IS NULL
               OR pr.tracking_code ILIKE $6 ESCAPE '\\'
               OR pr.address_line ILIKE $6 ESCAPE '\\'
               OR pr.landmark ILIKE $6 ESCAPE '\\'
           )
         ORDER BY pr.created_at DESC
         LIMIT $7 OFFSET $8"
    );

    let rows = sqlx::query_as::<_, PickupRequestRecord>(&sql)
        .bind(effective_ward_id)
        .bind(query.status)
        .bind(owner_user_id)
        .bind(phone_filter)
        .bind(collector_vehicle_id)
        .bind(search)
        .bind(limit)
        .bind(offset)
        .fetch_all(&state.pool)
        .await?;

    Ok(Json(rows))
}

/// `POST /api/v1/pickups`
/// Authenticated citizen/admin pickup creation binding ownership and using sequence tracking codes.
pub async fn create_pickup(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<CreatePickupRequest>,
) -> Result<(StatusCode, Json<PickupRequestRecord>), AppError> {
    let auth_user = require_role(
        &state,
        &headers,
        &[Role::Citizen, Role::Collector, Role::Admin],
    )
    .await?;

    let citizen_name = payload
        .citizen_name
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(str::to_string)
        .unwrap_or_else(|| auth_user.display_label());

    if citizen_name.chars().count() < 2 || citizen_name.chars().count() > 120 {
        return Err(AppError::validation(
            "Citizen name must be 2–120 characters.",
            "অনুগ্রহ করে ২ থেকে ১২০ অক্ষরের মধ্যে আপনার নাম লিখুন।",
        ));
    }

    let address = payload.address_line.trim();
    if address.chars().count() < 4 || address.chars().count() > 300 {
        return Err(AppError::validation(
            "Pickup address must be 4–300 characters.",
            "বাড়ি ও রোডের ঠিকানা ৪ থেকে ৩০০ অক্ষরের মধ্যে স্পষ্ট করে লিখুন।",
        ));
    }

    let landmark = payload.landmark.trim();
    if landmark.chars().count() > 200 {
        return Err(AppError::validation(
            "Landmark cannot exceed 200 characters.",
            "কাছের পরিচিত স্থান ২০০ অক্ষরের বেশি হতে পারবে না।",
        ));
    }

    let notes = payload.notes.trim();
    if notes.chars().count() > 500 {
        return Err(AppError::validation(
            "Notes cannot exceed 500 characters.",
            "অতিরিক্ত তথ্য ৫০০ অক্ষরের বেশি হতে পারবে না।",
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
    if !matches!(payload.schedule_type.as_str(), "one_time" | "recurring_weekly") {
        return Err(AppError::validation(
            "Invalid schedule_type.",
            "পিকআপের সময়সূচি সঠিক নয়।",
        ));
    }

    let preferred_day = payload
        .preferred_day
        .as_deref()
        .map(|s| s.trim().to_ascii_lowercase())
        .filter(|s| !s.is_empty());

    if payload.schedule_type == "recurring_weekly" {
        match preferred_day.as_deref() {
            Some(day) if VALID_DAYS.contains(&day) => {}
            _ => {
                return Err(AppError::validation(
                    "preferred_day must be a valid weekday for recurring weekly pickups.",
                    "সাপ্তাহিক পিকআপের জন্য সপ্তাহের একটি নির্দিষ্ট দিন নির্বাচন করুন।",
                ));
            }
        }
    }

    if !(1..=50).contains(&payload.estimated_bags) {
        return Err(AppError::validation(
            "estimated_bags must be between 1 and 50.",
            "বস্তার সংখ্যা ১ থেকে ৫০ এর মধ্যে হতে হবে।",
        ));
    }

    // Citizens always record their verified phone; only Admin can submit on behalf of another phone.
    let (phone, owner_override_needed) = match (&auth_user.role, payload.citizen_phone.as_deref()) {
        (Role::Admin, Some(raw)) if !raw.trim().is_empty() => {
            let normalized = normalize_bd_phone(raw)?;
            let is_self = normalized == auth_user.phone;
            (normalized, !is_self)
        }
        _ => (auth_user.phone.clone(), false),
    };

    let (lat, lng, ward_id) = match (payload.lat, payload.lng, payload.ward_id) {
        (Some(lat), Some(lng), Some(wid)) => {
            validate_coords(lat, lng)?;
            ensure_ward_exists(&state.pool, wid).await?;
            (lat, lng, wid)
        }
        (Some(lat), Some(lng), None) => {
            validate_coords(lat, lng)?;
            let (wid, _) = resolve_ward_id_and_match(&state.pool, lat, lng).await?;
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
                AppError::validation(
                    "Selected Savar ward or union does not exist.",
                    "সঠিক সাভার ওয়ার্ড বা ইউনিয়ন নির্বাচন করুন।",
                )
            })?;
            (c.lat, c.lng, wid)
        }
        _ => {
            return Err(AppError::validation(
                "Provide either a valid ward_id or both lat and lng coordinates.",
                "সঠিক ওয়ার্ড নির্বাচন করুন অথবা লোকেশন পিন দিন।",
            ));
        }
    };

    let mut tx = state.pool.begin().await?;
    let target_user_id: Option<Uuid> = if owner_override_needed {
        sqlx::query_scalar("SELECT id FROM users WHERE phone = $1")
            .bind(&phone)
            .fetch_optional(&mut *tx)
            .await?
    } else {
        Some(auth_user.user_id)
    };
    let seq_num: i64 = sqlx::query_scalar("SELECT nextval('pickup_tracking_seq')")
        .fetch_one(&mut *tx)
        .await?;
    let tracking_code = generate_tracking_code("CS-PK", seq_num);
    let id = Uuid::new_v4();

    sqlx::query(
        r#"
        INSERT INTO pickup_requests (
            id, tracking_code, user_id, citizen_name, citizen_phone, ward_id,
            address_line, landmark, waste_type, slot, schedule_type, preferred_day,
            estimated_bags, status, location, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending', ST_SetSRID(ST_MakePoint($14, $15), 4326), $16)
        "#,
    )
    .bind(id)
    .bind(&tracking_code)
    .bind(target_user_id)
    .bind(&citizen_name)
    .bind(&phone)
    .bind(ward_id)
    .bind(address)
    .bind(landmark)
    .bind(&payload.waste_type)
    .bind(&payload.slot)
    .bind(&payload.schedule_type)
    .bind(&preferred_day)
    .bind(payload.estimated_bags)
    .bind(lng)
    .bind(lat)
    .bind(notes)
    .execute(&mut *tx)
    .await?;

    sqlx::query(
        r#"
        INSERT INTO status_events (
            entity_type, entity_id, pickup_id, from_status, to_status,
            actor_user_id, actor_label, note_bn
        )
        VALUES ('pickup', $1, $1, NULL, 'pending', $2, $3, 'নাগরিকের পিকআপ রিকোয়েস্ট গ্রহণ করা হয়েছে')
        "#,
    )
    .bind(id)
    .bind(auth_user.user_id)
    .bind(&citizen_name)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    let created = fetch_pickup_by_id(&state, id).await?;
    Ok((StatusCode::CREATED, Json(created)))
}

/// `GET /api/v1/pickups/track/:code`
/// Publicly lookupable with masked citizen PII; full address/phone shown only to owner, verified phone match, collector, or admin.
pub async fn track_by_code(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(code): Path<String>,
    Query(verify): Query<TrackVerifyQuery>,
) -> Result<Json<TrackedPickupResponse>, AppError> {
    let ip = extract_client_ip(&headers);
    state
        .rate_limiter
        .check(&format!("track_ip:{ip}"), 60, 600)
        .await?;

    let auth_user = extract_optional_auth(&state, &headers).await?;
    let normalized_code = code.trim().to_uppercase();
    if verify.phone.as_deref().is_some_and(|p| !p.trim().is_empty()) {
        state
            .rate_limiter
            .check(&format!("track_verify:{normalized_code}:{ip}"), 8, 900)
            .await?;
    }

    let sql = format!("{PICKUP_SELECT_BASE} WHERE pr.tracking_code = $1");

    let mut pickup = sqlx::query_as::<_, PickupRequestRecord>(&sql)
        .bind(&normalized_code)
        .fetch_optional(&state.pool)
        .await?
        .ok_or_else(|| {
            AppError::not_found(
                "Pickup request tracking code not found.",
                "এই ট্র্যাকিং কোডের কোনো পিকআপ রিকোয়েস্ট পাওয়া যায়নি।",
            )
        })?;

    let phone_verified = verify
        .phone
        .as_deref()
        .and_then(|p| normalize_bd_phone(p).ok())
        .is_some_and(|p| p == pickup.citizen_phone);

    let is_authorized = is_owner_or_staff(auth_user.as_ref(), pickup.user_id, &pickup.citizen_phone)
        || phone_verified;

    if !is_authorized {
        pickup.citizen_name = "সাভারের নাগরিক".to_string();
        pickup.citizen_phone = mask_phone(&pickup.citizen_phone);
        pickup.address_line = "গোপনীয় ঠিকানা (যাচাইকৃত লগইন বা ফোন নম্বরে দৃশ্যমান)".to_string();
        pickup.landmark = "গোপনীয় স্থান".to_string();
        pickup.notes = String::new();
        pickup.completion_photo_url = None;
        pickup.lat = (pickup.lat * 100.0).round() / 100.0;
        pickup.lng = (pickup.lng * 100.0).round() / 100.0;
    }

    let mut events = sqlx::query_as::<_, StatusEventRecord>(
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

    if !is_authorized {
        for ev in &mut events {
            ev.actor_label = "সিস্টেম/টিম".to_string();
        }
    }

    Ok(Json(TrackedPickupResponse { pickup, events }))
}

/// `PATCH /api/v1/pickups/:id/status`
/// Role-enforced state transition with vehicle release on completion/cancellation and citizen notification.
pub async fn update_pickup_status(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdatePickupStatusRequest>,
) -> Result<Json<PickupRequestRecord>, AppError> {
    let auth_user = require_role(&state, &headers, &[Role::Collector, Role::Admin]).await?;

    if !VALID_PICKUP_STATUSES.contains(&payload.status.as_str()) {
        return Err(AppError::validation(
            "Invalid pickup status.",
            "পিকআপ স্ট্যাটাসটি সঠিক নয়।",
        ));
    }

    if payload.note_bn.trim().chars().count() > 500 {
        return Err(AppError::validation(
            "Status note cannot exceed 500 characters.",
            "মন্তব্য ৫০০ অক্ষরের বেশি হওয়া যাবে না।",
        ));
    }

    if let Some(w) = payload.weight_kg {
        if !w.is_finite() || w < 0.0 || w > 10_000.0 {
            return Err(AppError::validation(
                "weight_kg must be between 0 and 10000.",
                "বর্জ্যের ওজন ০ থেকে ১০,০০০ কেজির মধ্যে হতে হবে।",
            ));
        }
    }

    let mut tx = state.pool.begin().await?;

    #[derive(sqlx::FromRow)]
    struct PickupStateRow {
        status: String,
        tracking_code: String,
        user_id: Option<Uuid>,
        assigned_vehicle_id: Option<Uuid>,
    }

    let row = sqlx::query_as::<_, PickupStateRow>(
        "SELECT status, tracking_code, user_id, assigned_vehicle_id FROM pickup_requests WHERE id = $1 FOR UPDATE",
    )
    .bind(id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(|| {
        AppError::not_found(
            "Pickup request not found.",
            "পিকআপ রিকোয়েস্টটি খুঁজে পাওয়া যায়নি।",
        )
    })?;

    if auth_user.role == Role::Collector
        && (auth_user.vehicle_id.is_none() || row.assigned_vehicle_id != auth_user.vehicle_id)
    {
        return Err(AppError::forbidden(
            "Collectors can only update pickup tasks assigned to their own vehicle.",
            "কালেক্টর কেবল নিজের গাড়িতে নির্ধারিত পিকআপের স্ট্যাটাস পরিবর্তন করতে পারবেন।",
        ));
    }

    if !is_valid_pickup_transition(&row.status, &payload.status) {
        return Err(AppError::conflict(
            format!("Cannot transition pickup from '{}' to '{}'.", row.status, payload.status),
            "বর্তমান অবস্থা থেকে এই স্ট্যাটাসে পরিবর্তন করা যাবে না।",
        ));
    }

    sqlx::query(
        r#"
        UPDATE pickup_requests
        SET status = $2,
            weight_kg = COALESCE($3, weight_kg),
            completed_at = CASE WHEN $2 = 'collected' THEN NOW() ELSE completed_at END,
            updated_at = NOW()
        WHERE id = $1
        "#,
    )
    .bind(id)
    .bind(&payload.status)
    .bind(payload.weight_kg)
    .execute(&mut *tx)
    .await?;

    if matches!(payload.status.as_str(), "collected" | "cancelled") {
        release_vehicle_if_idle(&mut tx, row.assigned_vehicle_id).await?;
    }

    let actor_label = auth_user.display_label();
    sqlx::query(
        r#"
        INSERT INTO status_events (
            entity_type, entity_id, pickup_id, from_status, to_status,
            actor_user_id, actor_label, note_bn
        )
        VALUES ('pickup', $1, $1, $2, $3, $4, $5, $6)
        "#,
    )
    .bind(id)
    .bind(&row.status)
    .bind(&payload.status)
    .bind(auth_user.user_id)
    .bind(&actor_label)
    .bind(payload.note_bn.trim())
    .execute(&mut *tx)
    .await?;

    let notif_body = format!(
        "আপনার পিকআপ {} এর বর্তমান অবস্থা: {}।",
        row.tracking_code,
        pickup_status_bn(&payload.status)
    );
    create_notification(
        &mut tx,
        row.user_id,
        "পিকআপ স্ট্যাটাস আপডেট",
        &notif_body,
        "pickup",
        id,
    )
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
        .ok_or_else(|| {
            AppError::not_found(
                "Pickup request not found.",
                "পিকআপ রিকোয়েস্ট পাওয়া যায়নি।",
            )
        })
}

fn is_owner_or_staff(auth_user: Option<&AuthUser>, owner_id: Option<Uuid>, phone: &str) -> bool {
    let Some(user) = auth_user else {
        return false;
    };
    matches!(user.role, Role::Admin | Role::Collector)
        || owner_id == Some(user.user_id)
        || user.phone == phone
}

fn pickup_status_bn(status: &str) -> &'static str {
    match status {
        "pending" => "অপেক্ষমাণ",
        "assigned" => "গাড়ি নির্ধারিত",
        "in_progress" => "সংগ্রহ চলছে",
        "collected" => "সংগ্রহ সম্পন্ন",
        "cancelled" => "বাতিল",
        _ => "আপডেট",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn enforces_valid_pickup_state_transitions() {
        assert!(is_valid_pickup_transition("pending", "assigned"));
        assert!(is_valid_pickup_transition("assigned", "collected"));
        assert!(!is_valid_pickup_transition("collected", "pending"));
        assert!(!is_valid_pickup_transition("cancelled", "assigned"));
    }
}
