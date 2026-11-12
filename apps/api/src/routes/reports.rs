use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::types::Json as SqlxJson;
use uuid::Uuid;

use crate::{
    auth::{extract_optional_auth, require_role, AuthUser, Role},
    db::{
        create_notification, ensure_ward_exists, mask_phone, normalize_bd_phone,
        release_vehicle_if_idle, resolve_ward_id_and_match, validate_coords,
        validate_uploaded_photo_url, AppState,
    },
    error::AppError,
    models::{
        dump_report::{
            CreateDumpReportRequest, CreateDumpReportResponse, DumpReportRecord, ListReportsQuery,
            PublicHotspotRecord, UpdateReportStatusRequest,
        },
        partner::StatusEventRecord,
    },
};

const REPORT_SELECT_BASE: &str = r#"
    SELECT
        dr.id,
        dr.tracking_code,
        dr.user_id,
        dr.reporter_name,
        dr.reporter_phone,
        dr.ward_id,
        w.name_bn AS ward_name_bn,
        dr.title_bn,
        dr.description_bn,
        dr.landmark,
        dr.severity,
        dr.status,
        ST_Y(dr.location) AS lat,
        ST_X(dr.location) AS lng,
        dr.photo_urls,
        dr.resolved_photo_url,
        dr.assigned_vehicle_id,
        cv.code AS assigned_vehicle_code,
        dr.duplicate_of,
        dr.duplicate_count,
        dr.cleared_at,
        dr.created_at,
        dr.updated_at
    FROM dump_reports dr
    JOIN wards w ON w.id = dr.ward_id
    LEFT JOIN collector_vehicles cv ON cv.id = dr.assigned_vehicle_id
"#;

const VALID_SEVERITIES: &[&str] = &["medium", "high", "critical"];
const VALID_REPORT_STATUSES: &[&str] =
    &["reported", "verified", "dispatched", "cleared", "rejected"];

#[derive(Serialize)]
pub struct TrackedReportResponse {
    pub report: DumpReportRecord,
    pub events: Vec<StatusEventRecord>,
}

#[derive(Debug, Deserialize)]
pub struct TrackVerifyQuery {
    pub phone: Option<String>,
}

/// Validate allowed state transitions for dump reports.
pub fn is_valid_report_transition(from: &str, to: &str) -> bool {
    if from == to {
        return true;
    }
    matches!(
        (from, to),
        ("reported", "verified" | "dispatched" | "rejected")
            | ("verified", "dispatched" | "cleared" | "rejected")
            | ("dispatched", "cleared" | "rejected")
    )
}

/// `GET /api/v1/reports/public`
/// Public hotspot summary strictly stripped of citizen phone numbers and reporter names.
pub async fn list_public_hotspots(
    State(state): State<AppState>,
    Query(query): Query<ListReportsQuery>,
) -> Result<Json<Vec<PublicHotspotRecord>>, AppError> {
    let limit = query.limit.unwrap_or(20).clamp(1, 50);

    let rows = sqlx::query_as::<_, PublicHotspotRecord>(
        r#"
        SELECT
            dr.id,
            dr.tracking_code,
            dr.ward_id,
            w.name_bn AS ward_name_bn,
            dr.title_bn,
            dr.landmark,
            dr.severity,
            dr.status,
            ST_Y(dr.location) AS lat,
            ST_X(dr.location) AS lng,
            dr.duplicate_count,
            dr.cleared_at,
            dr.created_at
        FROM dump_reports dr
        JOIN wards w ON w.id = dr.ward_id
        WHERE dr.duplicate_of IS NULL
          AND ($1::SMALLINT IS NULL OR dr.ward_id = $1)
          AND ($2::TEXT IS NULL OR dr.status = $2)
        ORDER BY
            CASE dr.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 ELSE 3 END ASC,
            dr.created_at DESC
        LIMIT $3
        "#,
    )
    .bind(query.ward_id)
    .bind(query.status)
    .bind(limit)
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(rows))
}

/// `GET /api/v1/reports`
/// Authenticated, role-scoped dump report listing with geospatial radius and search filtering.
pub async fn list_reports(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<ListReportsQuery>,
) -> Result<Json<Vec<DumpReportRecord>>, AppError> {
    let auth_user = require_role(
        &state,
        &headers,
        &[Role::Citizen, Role::Collector, Role::Admin],
    )
    .await?;

    let limit = query.limit.unwrap_or(50).clamp(1, 100);
    let page = query.page.unwrap_or(1).max(1);
    let offset = (page - 1) * limit;
    let include_duplicates = query.include_duplicates.unwrap_or(true);

    if let Some(ref st) = query.status {
        if !VALID_REPORT_STATUSES.contains(&st.as_str()) {
            return Err(AppError::validation(
                "Invalid report status filter.",
                "সঠিক রিপোর্ট স্ট্যাটাস ফিল্টার দিন।",
            ));
        }
    }

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

    let radius_m = query.radius_m.unwrap_or(1500.0).clamp(50.0, 25000.0);
    let search = query
        .q
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(|s| format!("%{s}%"));

    let owner_user_id: Option<Uuid> = if auth_user.role == Role::Citizen {
        Some(auth_user.user_id)
    } else {
        None
    };

    let owner_phone: Option<String> = if auth_user.role == Role::Citizen {
        Some(auth_user.phone.clone())
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
        "{REPORT_SELECT_BASE}
         WHERE ($1::SMALLINT IS NULL OR dr.ward_id = $1)
           AND ($2::TEXT IS NULL OR dr.status = $2)
           AND ($3::BOOLEAN = TRUE OR dr.duplicate_of IS NULL)
           AND (
               $4::UUID IS NULL
               OR dr.user_id = $4
               OR dr.reporter_phone = $5
           )
           AND (
               $6::UUID IS NULL
               OR dr.assigned_vehicle_id = $6
               OR (
                   dr.assigned_vehicle_id IS NULL
                   AND EXISTS (
                       SELECT 1 FROM collector_vehicles cv
                       WHERE cv.id = $6 AND cv.ward_id = dr.ward_id
                   )
               )
           )
           AND (
               $7::DOUBLE PRECISION IS NULL
               OR $8::DOUBLE PRECISION IS NULL
               OR ST_DWithin(
                   dr.location::geography,
                   ST_SetSRID(ST_MakePoint($8, $7), 4326)::geography,
                   $9
               )
           )
           AND (
               $10::TEXT IS NULL
               OR dr.tracking_code ILIKE $10
               OR dr.title_bn ILIKE $10
               OR dr.landmark ILIKE $10
           )
         ORDER BY
           CASE dr.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 ELSE 3 END ASC,
           dr.created_at DESC
         LIMIT $11 OFFSET $12"
    );

    let rows = sqlx::query_as::<_, DumpReportRecord>(&sql)
        .bind(effective_ward_id)
        .bind(query.status)
        .bind(include_duplicates)
        .bind(owner_user_id)
        .bind(owner_phone)
        .bind(collector_vehicle_id)
        .bind(query.lat)
        .bind(query.lng)
        .bind(radius_m)
        .bind(search)
        .bind(limit)
        .bind(offset)
        .fetch_all(&state.pool)
        .await?;

    Ok(Json(rows))
}

/// `POST /api/v1/reports`
/// Authenticated dump report submission with sanitized photo URLs and per-ward 50m PostGIS duplicate clustering.
pub async fn create_report(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<CreateDumpReportRequest>,
) -> Result<(StatusCode, Json<CreateDumpReportResponse>), AppError> {
    let auth_user = require_role(
        &state,
        &headers,
        &[Role::Citizen, Role::Collector, Role::Admin],
    )
    .await?;

    validate_coords(payload.lat, payload.lng)?;

    let title = payload.title_bn.trim();
    if title.chars().count() < 4 || title.chars().count() > 200 {
        return Err(AppError::validation(
            "Dump report title must be 4–200 characters.",
            "ময়লার স্তূপের সংক্ষিপ্ত বিবরণ ৪ থেকে ২০০ অক্ষরের মধ্যে লিখুন।",
        ));
    }

    let landmark = payload.landmark.trim();
    if landmark.chars().count() < 3 || landmark.chars().count() > 200 {
        return Err(AppError::validation(
            "Landmark must be 3–200 characters.",
            "কাছাকাছি পরিচিত স্থান বা মোড়ের নাম ৩ থেকে ২০০ অক্ষরের মধ্যে লিখুন।",
        ));
    }

    let description = payload.description_bn.trim();
    if description.chars().count() > 1000 {
        return Err(AppError::validation(
            "Description cannot exceed 1000 characters.",
            "বিস্তারিত বিবরণ ১০০০ অক্ষরের বেশি হতে পারবে না।",
        ));
    }

    if !VALID_SEVERITIES.contains(&payload.severity.as_str()) {
        return Err(AppError::validation(
            "Invalid severity.",
            "সঠিক জরুরি মাত্রা নির্বাচন করুন।",
        ));
    }

    if payload.photo_urls.len() > 5 {
        return Err(AppError::validation(
            "A maximum of 5 photos can be attached.",
            "সর্বোচ্চ ৫টি ছবি সংযুক্ত করা যাবে।",
        ));
    }

    let mut clean_photos = Vec::with_capacity(payload.photo_urls.len());
    for url in &payload.photo_urls {
        clean_photos.push(validate_uploaded_photo_url(url, &state.public_upload_base_url)?);
    }

    let (phone, owner_override_needed) = match (&auth_user.role, payload.reporter_phone.as_deref()) {
        (Role::Admin, Some(raw)) if !raw.trim().is_empty() => {
            let normalized = normalize_bd_phone(raw)?;
            let is_self = normalized == auth_user.phone;
            (normalized, !is_self)
        }
        _ => (auth_user.phone.clone(), false),
    };

    let reporter_name = if !payload.reporter_name.trim().is_empty() {
        payload.reporter_name.trim().chars().take(120).collect()
    } else {
        auth_user.display_label()
    };

    let ward_id = match payload.ward_id {
        Some(wid) => {
            ensure_ward_exists(&state.pool, wid).await?;
            wid
        }
        None => resolve_ward_id_and_match(&state.pool, payload.lat, payload.lng)
            .await?
            .0,
    };

    let mut tx = state.pool.begin().await?;

    // Per-ward advisory lock prevents duplicate race within a ward without blocking other Savar zones.
    let ward_lock_key: i64 = 0x4353_0000_i64 + i64::from(ward_id);
    sqlx::query("SELECT pg_advisory_xact_lock($1)")
        .bind(ward_lock_key)
        .execute(&mut *tx)
        .await?;

    #[derive(sqlx::FromRow)]
    struct NearbyOpenReport {
        id: Uuid,
        distance_meters: f64,
    }

    let existing = sqlx::query_as::<_, NearbyOpenReport>(
        r#"
        SELECT
            id,
            ST_Distance(
                location::geography,
                ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
            ) AS distance_meters
        FROM dump_reports
        WHERE status IN ('reported', 'verified', 'dispatched')
          AND duplicate_of IS NULL
          AND ST_DWithin(
                location::geography,
                ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
                $3
              )
        ORDER BY distance_meters ASC, created_at ASC
        LIMIT 1
        FOR UPDATE
        "#,
    )
    .bind(payload.lng)
    .bind(payload.lat)
    .bind(state.duplicate_radius_meters)
    .fetch_optional(&mut *tx)
    .await?;

    let (duplicate_of, duplicate_distance) = match existing {
        Some(ref match_row) => {
            sqlx::query(
                "UPDATE dump_reports SET duplicate_count = duplicate_count + 1, updated_at = NOW() WHERE id = $1",
            )
            .bind(match_row.id)
            .execute(&mut *tx)
            .await?;
            (Some(match_row.id), Some(match_row.distance_meters))
        }
        None => (None, None),
    };

    let target_user_id: Option<Uuid> = if owner_override_needed {
        sqlx::query_scalar("SELECT id FROM users WHERE phone = $1")
            .bind(&phone)
            .fetch_optional(&mut *tx)
            .await?
    } else {
        Some(auth_user.user_id)
    };

    let seq_num: i64 = sqlx::query_scalar("SELECT nextval('report_tracking_seq')")
        .fetch_one(&mut *tx)
        .await?;
    let tracking_code = format!("CS-DR-{seq_num:05}");
    let id = Uuid::new_v4();

    sqlx::query(
        r#"
        INSERT INTO dump_reports (
            id, tracking_code, user_id, reporter_name, reporter_phone, ward_id,
            title_bn, description_bn, landmark, severity, status, location, photo_urls, duplicate_of
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'reported', ST_SetSRID(ST_MakePoint($11, $12), 4326), $13, $14)
        "#,
    )
    .bind(id)
    .bind(&tracking_code)
    .bind(target_user_id)
    .bind(&reporter_name)
    .bind(&phone)
    .bind(ward_id)
    .bind(title)
    .bind(description)
    .bind(landmark)
    .bind(&payload.severity)
    .bind(payload.lng)
    .bind(payload.lat)
    .bind(SqlxJson(clean_photos))
    .bind(duplicate_of)
    .execute(&mut *tx)
    .await?;

    let note = if duplicate_of.is_some() {
        "৫০ মিটারের মধ্যে চলমান রিপোর্টের সাথে যুক্ত করা হয়েছে"
    } else {
        "ছবি ও লোকেশনসহ ময়লার রিপোর্ট জমা হয়েছে"
    };

    sqlx::query(
        r#"
        INSERT INTO status_events (
            entity_type, entity_id, dump_report_id, from_status, to_status,
            actor_user_id, actor_label, note_bn
        )
        VALUES ('dump_report', $1, $1, NULL, 'reported', $2, $3, $4)
        "#,
    )
    .bind(id)
    .bind(auth_user.user_id)
    .bind(&reporter_name)
    .bind(note)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    let report = fetch_report_by_id(&state, id).await?;
    Ok((
        StatusCode::CREATED,
        Json(CreateDumpReportResponse {
            is_duplicate: duplicate_of.is_some(),
            duplicate_of,
            duplicate_distance_meters: duplicate_distance,
            report,
        }),
    ))
}

/// `GET /api/v1/reports/track/:code`
pub async fn track_by_code(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(code): Path<String>,
    Query(verify): Query<TrackVerifyQuery>,
) -> Result<Json<TrackedReportResponse>, AppError> {
    let auth_user = extract_optional_auth(&state, &headers).await?;
    let normalized_code = code.trim().to_uppercase();
    let sql = format!("{REPORT_SELECT_BASE} WHERE dr.tracking_code = $1");

    let mut report = sqlx::query_as::<_, DumpReportRecord>(&sql)
        .bind(&normalized_code)
        .fetch_optional(&state.pool)
        .await?
        .ok_or_else(|| {
            AppError::not_found(
                "Dump report tracking code not found.",
                "এই ট্র্যাকিং কোডের কোনো রিপোর্ট পাওয়া যায়নি।",
            )
        })?;

    let phone_verified = verify
        .phone
        .as_deref()
        .and_then(|p| normalize_bd_phone(p).ok())
        .is_some_and(|p| p == report.reporter_phone);

    let is_authorized = is_owner_or_staff(auth_user.as_ref(), report.user_id, &report.reporter_phone)
        || phone_verified;

    if !is_authorized {
        report.reporter_phone = mask_phone(&report.reporter_phone);
        report.reporter_name = "সাভারের নাগরিক".to_string();
    }

    let events = sqlx::query_as::<_, StatusEventRecord>(
        r#"
        SELECT id, entity_type, entity_id, from_status, to_status, actor_label, note_bn, created_at
        FROM status_events
        WHERE entity_type = 'dump_report' AND entity_id = $1
        ORDER BY created_at ASC
        "#,
    )
    .bind(report.id)
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(TrackedReportResponse { report, events }))
}

/// `PATCH /api/v1/reports/:id/status`
/// Role-enforced report transitions with validated proof URL, duplicate cascading, and vehicle release.
pub async fn update_report_status(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateReportStatusRequest>,
) -> Result<Json<DumpReportRecord>, AppError> {
    let auth_user = require_role(&state, &headers, &[Role::Collector, Role::Admin]).await?;

    if !VALID_REPORT_STATUSES.contains(&payload.status.as_str()) {
        return Err(AppError::validation(
            "Invalid report status.",
            "রিপোর্ট স্ট্যাটাসটি সঠিক নয়।",
        ));
    }

    if payload.note_bn.trim().chars().count() > 500 {
        return Err(AppError::validation(
            "Status note cannot exceed 500 characters.",
            "মন্তব্য ৫০০ অক্ষরের বেশি হওয়া যাবে না।",
        ));
    }

    let resolved_photo_url = payload
        .resolved_photo_url
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(|u| validate_uploaded_photo_url(u, &state.public_upload_base_url))
        .transpose()?;

    let mut tx = state.pool.begin().await?;

    #[derive(sqlx::FromRow)]
    struct ReportStateRow {
        status: String,
        tracking_code: String,
        user_id: Option<Uuid>,
        assigned_vehicle_id: Option<Uuid>,
    }

    let row = sqlx::query_as::<_, ReportStateRow>(
        "SELECT status, tracking_code, user_id, assigned_vehicle_id FROM dump_reports WHERE id = $1 FOR UPDATE",
    )
    .bind(id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(|| {
        AppError::not_found(
            "Dump report not found.",
            "ময়লার রিপোর্টটি খুঁজে পাওয়া যায়নি।",
        )
    })?;

    if auth_user.role == Role::Collector
        && (auth_user.vehicle_id.is_none() || row.assigned_vehicle_id != auth_user.vehicle_id)
    {
        return Err(AppError::forbidden(
            "Collectors can only update reports assigned to their own vehicle.",
            "কালেক্টর কেবল নিজের গাড়িতে নির্ধারিত কাজের স্ট্যাটাস পরিবর্তন করতে পারবেন।",
        ));
    }

    if !is_valid_report_transition(&row.status, &payload.status) {
        return Err(AppError::conflict(
            format!("Cannot transition dump report from '{}' to '{}'.", row.status, payload.status),
            "বর্তমান অবস্থা থেকে এই স্ট্যাটাসে পরিবর্তন করা যাবে না।",
        ));
    }

    sqlx::query(
        r#"
        UPDATE dump_reports
        SET status = $2,
            resolved_photo_url = COALESCE($3, resolved_photo_url),
            cleared_at = CASE WHEN $2 = 'cleared' THEN NOW() ELSE cleared_at END,
            updated_at = NOW()
        WHERE id = $1
        "#,
    )
    .bind(id)
    .bind(&payload.status)
    .bind(&resolved_photo_url)
    .execute(&mut *tx)
    .await?;

    // Cascade terminal cleared/rejected resolution to clustered child duplicates.
    if matches!(payload.status.as_str(), "cleared" | "rejected") {
        sqlx::query(
            r#"
            UPDATE dump_reports
            SET status = $2,
                resolved_photo_url = COALESCE($3, resolved_photo_url),
                cleared_at = CASE WHEN $2 = 'cleared' THEN NOW() ELSE cleared_at END,
                updated_at = NOW()
            WHERE duplicate_of = $1
              AND status IN ('reported', 'verified', 'dispatched')
            "#,
        )
        .bind(id)
        .bind(&payload.status)
        .bind(&resolved_photo_url)
        .execute(&mut *tx)
        .await?;

        release_vehicle_if_idle(&mut tx, row.assigned_vehicle_id).await?;
    }

    let actor_label = auth_user.display_label();
    sqlx::query(
        r#"
        INSERT INTO status_events (
            entity_type, entity_id, dump_report_id, from_status, to_status,
            actor_user_id, actor_label, note_bn
        )
        VALUES ('dump_report', $1, $1, $2, $3, $4, $5, $6)
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
        "আপনার অভিযোগ {} এর বর্তমান অবস্থা: {}।",
        row.tracking_code,
        report_status_bn(&payload.status)
    );
    create_notification(
        &mut tx,
        row.user_id,
        "ময়লার অভিযোগ আপডেট",
        &notif_body,
        "dump_report",
        id,
    )
    .await?;

    tx.commit().await?;

    Ok(Json(fetch_report_by_id(&state, id).await?))
}

async fn fetch_report_by_id(state: &AppState, id: Uuid) -> Result<DumpReportRecord, AppError> {
    let sql = format!("{REPORT_SELECT_BASE} WHERE dr.id = $1");
    sqlx::query_as::<_, DumpReportRecord>(&sql)
        .bind(id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or_else(|| AppError::not_found("Dump report not found.", "রিপোর্ট পাওয়া যায়নি।"))
}

fn is_owner_or_staff(auth_user: Option<&AuthUser>, owner_id: Option<Uuid>, phone: &str) -> bool {
    let Some(user) = auth_user else {
        return false;
    };
    matches!(user.role, Role::Admin | Role::Collector)
        || owner_id == Some(user.user_id)
        || user.phone == phone
}

fn report_status_bn(status: &str) -> &'static str {
    match status {
        "reported" => "রিপোর্ট জমা",
        "verified" => "যাচাইকৃত",
        "dispatched" => "টিম রওনা হয়েছে",
        "cleared" => "পরিষ্কার হয়েছে",
        "rejected" => "বাতিল",
        _ => "আপডেট",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn enforces_valid_report_state_transitions() {
        assert!(is_valid_report_transition("reported", "verified"));
        assert!(is_valid_report_transition("verified", "cleared"));
        assert!(!is_valid_report_transition("cleared", "reported"));
        assert!(!is_valid_report_transition("rejected", "dispatched"));
    }
}
