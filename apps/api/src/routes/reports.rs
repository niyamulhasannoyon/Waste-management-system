use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::Serialize;
use sqlx::types::Json as SqlxJson;
use uuid::Uuid;

use crate::{
    db::{normalize_bd_phone, resolve_ward_id_by_coords, validate_coords, AppState},
    error::AppError,
    models::{
        dump_report::{
            CreateDumpReportRequest, DumpReportRecord, ListReportsQuery, UpdateReportStatusRequest,
        },
        partner::StatusEventRecord,
    },
};

const REPORT_SELECT_BASE: &str = r#"
    SELECT
        dr.id,
        dr.tracking_code,
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

pub async fn list_reports(
    State(state): State<AppState>,
    Query(query): Query<ListReportsQuery>,
) -> Result<Json<Vec<DumpReportRecord>>, AppError> {
    let limit = query.limit.unwrap_or(50).clamp(1, 200);

    if let (Some(lat), Some(lng)) = (query.lat, query.lng) {
        validate_coords(lat, lng)?;
    }

    let radius_m = query.radius_m.unwrap_or(1500.0).clamp(50.0, 25000.0);

    let sql = format!(
        "{REPORT_SELECT_BASE}
         WHERE ($1::SMALLINT IS NULL OR dr.ward_id = $1)
           AND ($2::TEXT IS NULL OR dr.status = $2)
           AND (
               $3::DOUBLE PRECISION IS NULL
               OR $4::DOUBLE PRECISION IS NULL
               OR ST_DWithin(
                   dr.location::geography,
                   ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography,
                   $5
               )
           )
         ORDER BY
           CASE dr.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 ELSE 3 END ASC,
           dr.created_at DESC
         LIMIT $6"
    );

    let rows = sqlx::query_as::<_, DumpReportRecord>(&sql)
        .bind(query.ward_id)
        .bind(query.status)
        .bind(query.lat)
        .bind(query.lng)
        .bind(radius_m)
        .bind(limit)
        .fetch_all(&state.pool)
        .await?;

    Ok(Json(rows))
}

pub async fn create_report(
    State(state): State<AppState>,
    Json(payload): Json<CreateDumpReportRequest>,
) -> Result<(StatusCode, Json<DumpReportRecord>), AppError> {
    validate_coords(payload.lat, payload.lng)?;

    if payload.title_bn.trim().len() < 4 {
        return Err(AppError::validation(
            "Dump report title is too short.",
            "ময়লার স্তূপের সংক্ষিপ্ত বিবরণ লিখুন।",
        ));
    }
    if payload.landmark.trim().len() < 3 {
        return Err(AppError::validation(
            "Landmark is required.",
            "জায়গার কাছাকাছি পরিচিত কোনো স্থান বা মোড়ের নাম লিখুন।",
        ));
    }
    if !VALID_SEVERITIES.contains(&payload.severity.as_str()) {
        return Err(AppError::validation(
            "Invalid severity.",
            "সঠিক জরুরি মাত্রা নির্বাচন করুন।",
        ));
    }

    let phone = normalize_bd_phone(&payload.reporter_phone)?;
    let ward_id = match payload.ward_id {
        Some(w) => w,
        None => resolve_ward_id_by_coords(&state.pool, payload.lat, payload.lng).await?,
    };

    let id = Uuid::new_v4();
    let suffix = (id.as_u128() % 9000 + 1000) as u16;
    let tracking_code = format!("CS-DR-{suffix}");

    let mut tx = state.pool.begin().await?;

    sqlx::query(
        r#"
        INSERT INTO dump_reports (
            id, tracking_code, reporter_name, reporter_phone, ward_id,
            title_bn, description_bn, landmark, severity, status, location, photo_urls
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'reported', ST_SetSRID(ST_MakePoint($10, $11), 4326), $12)
        "#,
    )
    .bind(id)
    .bind(&tracking_code)
    .bind(payload.reporter_name.trim())
    .bind(&phone)
    .bind(ward_id)
    .bind(payload.title_bn.trim())
    .bind(payload.description_bn.trim())
    .bind(payload.landmark.trim())
    .bind(&payload.severity)
    .bind(payload.lng)
    .bind(payload.lat)
    .bind(SqlxJson(payload.photo_urls))
    .execute(&mut *tx)
    .await?;

    let actor = if payload.reporter_name.trim().is_empty() {
        "সাভারের নাগরিক"
    } else {
        payload.reporter_name.trim()
    };

    sqlx::query(
        r#"
        INSERT INTO status_events (entity_type, entity_id, from_status, to_status, actor_label, note_bn)
        VALUES ('dump_report', $1, NULL, 'reported', $2, 'ছবি ও লোকেশনসহ ময়লার রিপোর্ট জমা হয়েছে')
        "#,
    )
    .bind(id)
    .bind(actor)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok((StatusCode::CREATED, Json(fetch_report_by_id(&state, id).await?)))
}

pub async fn track_by_code(
    State(state): State<AppState>,
    Path(code): Path<String>,
) -> Result<Json<TrackedReportResponse>, AppError> {
    let normalized_code = code.trim().to_uppercase();
    let sql = format!("{REPORT_SELECT_BASE} WHERE dr.tracking_code = $1");

    let report = sqlx::query_as::<_, DumpReportRecord>(&sql)
        .bind(&normalized_code)
        .fetch_optional(&state.pool)
        .await?
        .ok_or_else(|| {
            AppError::not_found(
                "Dump report tracking code not found.",
                "এই ট্র্যাকিং কোডের কোনো রিপোর্ট পাওয়া যায়নি।",
            )
        })?;

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

pub async fn update_report_status(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateReportStatusRequest>,
) -> Result<Json<DumpReportRecord>, AppError> {
    if !VALID_REPORT_STATUSES.contains(&payload.status.as_str()) {
        return Err(AppError::validation(
            "Invalid report status.",
            "রিপোর্ট স্ট্যাটাসটি সঠিক নয়।",
        ));
    }

    let mut tx = state.pool.begin().await?;

    let previous_status: Option<String> =
        sqlx::query_scalar("SELECT status FROM dump_reports WHERE id = $1 FOR UPDATE")
            .bind(id)
            .fetch_optional(&mut *tx)
            .await?;

    let from_status = previous_status.ok_or_else(|| {
        AppError::not_found(
            "Dump report not found.",
            "ময়লার রিপোর্টটি খুঁজে পাওয়া যায়নি।",
        )
    })?;

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
    .bind(payload.resolved_photo_url)
    .execute(&mut *tx)
    .await?;

    sqlx::query(
        r#"
        INSERT INTO status_events (entity_type, entity_id, from_status, to_status, actor_label, note_bn)
        VALUES ('dump_report', $1, $2, $3, $4, $5)
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
