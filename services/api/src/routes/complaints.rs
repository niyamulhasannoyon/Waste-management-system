use axum::{
    extract::{Query, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use uuid::Uuid;

use crate::{
    auth::resolve_auth,
    db::{
        generate_tracking_code, normalize_bd_phone, resolve_zone_and_coords, validate_coords,
        AppState,
    },
    error::AppError,
    models::complaint::{
        ComplaintRecord, ComplaintStatus, CreateComplaintRequest, CreateComplaintResponse,
        ListComplaintsQuery,
    },
};

const COMPLAINT_SELECT_BASE: &str = r#"
    SELECT
        gc.id,
        gc.tracking_code,
        gc.user_id,
        gc.ward_id,
        sz.code AS ward_code,
        sz.name_en AS ward_name_en,
        sz.name_bn AS ward_name_bn,
        gc.assigned_worker_id,
        gc.reporter_phone,
        gc.category,
        gc.description,
        gc.landmark,
        gc.photo_url,
        ST_Y(gc.location::geometry) AS lat,
        ST_X(gc.location::geometry) AS lng,
        gc.status,
        gc.duplicate_of,
        gc.duplicate_count,
        gc.resolved_photo_url,
        gc.resolved_at,
        gc.created_at,
        gc.updated_at
    FROM garbage_complaints gc
    JOIN service_zones sz ON sz.id = gc.ward_id
"#;

// Advisory lock key ("CSDUPE") used briefly during complaint insertion to prevent
// concurrent complaints at the exact same spot from both passing the 50m check.
const COMPLAINT_DUPE_LOCK_KEY: i64 = 0x4353_4455_5045;

/// `POST /api/v1/complaints`
/// Submit a garbage report and automatically detect open complaints within 50m via PostGIS `ST_DWithin`.
pub async fn create_complaint(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<CreateComplaintRequest>,
) -> Result<(StatusCode, Json<CreateComplaintResponse>), AppError> {
    let auth_user = resolve_auth(&state, &headers).await?;
    validate_coords(payload.lat, payload.lng)?;

    let raw_phone = match payload.reporter_phone.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
        Some(p) => p.to_string(),
        None => auth_user
            .as_ref()
            .map(|u| u.phone.clone())
            .ok_or_else(|| {
                AppError::validation(
                    "MISSING_PHONE",
                    "reporter_phone is required when not authenticated.",
                )
            })?,
    };
    let phone = normalize_bd_phone(&raw_phone)?;

    let photo_url = payload
        .photo_url
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(|s| {
            if s.len() > 2048
                || (!s.starts_with("http://") && !s.starts_with("https://") && !s.starts_with('/'))
            {
                return Err(AppError::validation(
                    "INVALID_PHOTO_URL",
                    "photo_url must be a valid HTTP/HTTPS URL or relative path under 2048 chars.",
                ));
            }
            Ok(s.to_string())
        })
        .transpose()?;

    let (ward_id, lat, lng) = resolve_zone_and_coords(
        &state.pool,
        payload.ward_id,
        Some(payload.lat),
        Some(payload.lng),
    )
    .await?;

    let mut tx = state.pool.begin().await?;

    sqlx::query("SELECT pg_advisory_xact_lock($1)")
        .bind(COMPLAINT_DUPE_LOCK_KEY)
        .execute(&mut *tx)
        .await?;

    #[derive(sqlx::FromRow)]
    struct NearbyOpenComplaint {
        id: Uuid,
        tracking_code: String,
        distance_meters: f64,
    }

    let existing = sqlx::query_as::<_, NearbyOpenComplaint>(
        r#"
        SELECT
            id,
            tracking_code,
            ST_Distance(
                location,
                ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
            ) AS distance_meters
        FROM garbage_complaints
        WHERE status IN ('open', 'in_progress')
          AND duplicate_of IS NULL
          AND ST_DWithin(
                location,
                ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
                $3
              )
        ORDER BY distance_meters ASC, created_at ASC
        LIMIT 1
        FOR UPDATE
        "#,
    )
    .bind(lng)
    .bind(lat)
    .bind(state.config.duplicate_radius_meters)
    .fetch_optional(&mut *tx)
    .await?;

    let (status, duplicate_of, duplicate_tracking_code, duplicate_distance) = match existing {
        Some(ref match_row) => {
            sqlx::query(
                "UPDATE garbage_complaints SET duplicate_count = duplicate_count + 1, updated_at = NOW() WHERE id = $1",
            )
            .bind(match_row.id)
            .execute(&mut *tx)
            .await?;

            (
                ComplaintStatus::Duplicate,
                Some(match_row.id),
                Some(match_row.tracking_code.clone()),
                Some(match_row.distance_meters),
            )
        }
        None => (ComplaintStatus::Open, None, None, None),
    };

    let id = Uuid::new_v4();
    let tracking_code = generate_tracking_code("CS-CM", id);
    let user_id = auth_user.as_ref().map(|u| u.user_id);

    sqlx::query(
        r#"
        INSERT INTO garbage_complaints (
            id, tracking_code, user_id, ward_id, reporter_phone,
            category, description, landmark, photo_url, location,
            status, duplicate_of
        )
        VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9, ST_SetSRID(ST_MakePoint($10, $11), 4326)::geography,
            $12, $13
        )
        "#,
    )
    .bind(id)
    .bind(&tracking_code)
    .bind(user_id)
    .bind(ward_id)
    .bind(&phone)
    .bind(payload.category)
    .bind(payload.description.trim())
    .bind(payload.landmark.trim())
    .bind(photo_url)
    .bind(lng)
    .bind(lat)
    .bind(status)
    .bind(duplicate_of)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    let select_sql = format!("{COMPLAINT_SELECT_BASE} WHERE gc.id = $1");
    let complaint = sqlx::query_as::<_, ComplaintRecord>(&select_sql)
        .bind(id)
        .fetch_one(&state.pool)
        .await?;

    Ok((
        StatusCode::CREATED,
        Json(CreateComplaintResponse {
            is_duplicate: duplicate_of.is_some(),
            duplicate_of,
            duplicate_of_tracking_code: duplicate_tracking_code,
            duplicate_distance_meters: duplicate_distance,
            complaint,
        }),
    ))
}

/// `GET /api/v1/complaints`
/// List garbage complaints with ward, status, and duplicate filtering.
pub async fn list_complaints(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<ListComplaintsQuery>,
) -> Result<Json<Vec<ComplaintRecord>>, AppError> {
    let _auth_user = resolve_auth(&state, &headers).await?;

    let limit = query.limit.unwrap_or(20).clamp(1, 100);
    let offset = query.offset.unwrap_or(0).max(0);
    let include_duplicates = query.include_duplicates.unwrap_or(true);

    let list_sql = format!(
        "{COMPLAINT_SELECT_BASE}
         WHERE ($1::INTEGER IS NULL OR gc.ward_id = $1)
           AND ($2::complaint_status IS NULL OR gc.status = $2)
           AND ($3::BOOLEAN = TRUE OR gc.duplicate_of IS NULL)
         ORDER BY gc.created_at DESC
         LIMIT $4 OFFSET $5"
    );

    let items = sqlx::query_as::<_, ComplaintRecord>(&list_sql)
        .bind(query.ward_id)
        .bind(query.status)
        .bind(include_duplicates)
        .bind(limit)
        .bind(offset)
        .fetch_all(&state.pool)
        .await?;

    Ok(Json(items))
}
