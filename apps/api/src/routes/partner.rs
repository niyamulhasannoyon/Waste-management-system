use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use uuid::Uuid;

use crate::{
    auth::{require_role, Role},
    db::{ensure_ward_exists, AppState},
    error::{AppError, ErrorBody},
    models::partner::{ClaimLotRequest, CreateLotRequest, ListLotsQuery, RecyclableLotRecord},
};

const LOT_SELECT_BASE: &str = r#"
    SELECT
        rl.id,
        rl.lot_code,
        rl.ward_id,
        w.name_bn AS ward_name_bn,
        rl.material_type,
        rl.estimated_kg::float8 AS estimated_kg,
        rl.pickup_hub_bn,
        rl.status,
        rl.claimed_partner_id,
        rl.claimed_partner_name,
        rl.collected_at,
        rl.created_at
    FROM recyclable_lots rl
    JOIN wards w ON w.id = rl.ward_id
"#;

const VALID_MATERIALS: &[&str] = &["plastic", "paper_cardboard", "metal_ewaste", "glass"];
const VALID_LOT_STATUSES: &[&str] = &["open", "claimed", "collected"];

/// `GET /api/v1/partner/lots`
/// Partner/Admin endpoint supporting filters and pagination.
#[utoipa::path(
    get,
    path = "/api/v1/partner/lots",
    tag = "Partner",
    security(("bearerAuth" = [])),
    params(ListLotsQuery),
    responses(
        (status = 200, description = "Recyclable material lots", body = Vec<RecyclableLotRecord>),
        (status = 403, description = "Forbidden", body = ErrorBody)
    )
)]
pub async fn list_lots(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<ListLotsQuery>,
) -> Result<Json<Vec<RecyclableLotRecord>>, AppError> {
    let auth_user = require_role(&state, &headers, &[Role::Partner, Role::Admin]).await?;

    if let Some(ref st) = query.status {
        if !VALID_LOT_STATUSES.contains(&st.as_str()) {
            return Err(AppError::validation(
                "Invalid lot status filter.",
                "লট স্ট্যাটাস ফিল্টার সঠিক নয়।",
            ));
        }
    }

    if let Some(ref mat) = query.material_type {
        if !VALID_MATERIALS.contains(&mat.as_str()) {
            return Err(AppError::validation(
                "Invalid material_type filter.",
                "রিসাইক্লিং উপাদানের ধরন সঠিক নয়।",
            ));
        }
    }

    let limit = query.limit.unwrap_or(50).clamp(1, 100);
    let page = query.page.unwrap_or(1).max(1);
    let offset = (page - 1) * limit;

    let is_admin = auth_user.role == Role::Admin;
    let partner_scope_id: Option<Uuid> = if is_admin {
        None
    } else {
        Some(auth_user.partner_id.ok_or_else(|| {
            AppError::forbidden(
                "Verified recycling partner organization not linked to your account.",
                "আপনার অ্যাকাউন্টের সাথে কোনো অনুমোদিত রিসাইক্লিং প্রতিষ্ঠান যুক্ত নেই।",
            )
        })?)
    };

    let sql = format!(
        "{LOT_SELECT_BASE}
         WHERE ($1::TEXT IS NULL OR rl.status = $1)
           AND ($2::TEXT IS NULL OR rl.material_type = $2)
           AND ($3::SMALLINT IS NULL OR rl.ward_id = $3)
           AND (
               $4::BOOLEAN = TRUE
               OR rl.status = 'open'
               OR rl.claimed_partner_id = $5
           )
         ORDER BY rl.created_at DESC
         LIMIT $6 OFFSET $7"
    );

    let rows = sqlx::query_as::<_, RecyclableLotRecord>(&sql)
        .bind(query.status)
        .bind(query.material_type)
        .bind(query.ward_id)
        .bind(is_admin)
        .bind(partner_scope_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(&state.pool)
        .await?;

    Ok(Json(rows))
}

/// `POST /api/v1/partner/lots` (Admin only)
#[utoipa::path(
    post,
    path = "/api/v1/partner/lots",
    tag = "Partner",
    security(("bearerAuth" = [])),
    request_body = CreateLotRequest,
    responses(
        (status = 201, description = "Recyclable lot created", body = RecyclableLotRecord),
        (status = 403, description = "Admin access required", body = ErrorBody)
    )
)]
pub async fn create_lot(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<CreateLotRequest>,
) -> Result<(StatusCode, Json<RecyclableLotRecord>), AppError> {
    let _admin = require_role(&state, &headers, &[Role::Admin]).await?;

    ensure_ward_exists(&state.pool, payload.ward_id).await?;
    if !VALID_MATERIALS.contains(&payload.material_type.as_str()) {
        return Err(AppError::validation(
            "Invalid material_type.",
            "সঠিক রিসাইক্লিং উপাদান নির্বাচন করুন।",
        ));
    }
    if !payload.estimated_kg.is_finite()
        || payload.estimated_kg <= 0.0
        || payload.estimated_kg > 50_000.0
    {
        return Err(AppError::validation(
            "estimated_kg must be between 0 and 50000.",
            "লটের ওজন ০ থেকে ৫০,০০০ কেজির মধ্যে হতে হবে।",
        ));
    }
    let hub = payload.pickup_hub_bn.trim();
    if hub.chars().count() < 3 || hub.chars().count() > 200 {
        return Err(AppError::validation(
            "pickup_hub_bn must be 3–200 characters.",
            "সংগ্রহ কেন্দ্রের নাম ৩ থেকে ২০০ অক্ষরের মধ্যে লিখুন।",
        ));
    }

    let mut tx = state.pool.begin().await?;
    let seq_num: i64 = sqlx::query_scalar("SELECT nextval('lot_code_seq')")
        .fetch_one(&mut *tx)
        .await?;
    let lot_code = format!("CS-LOT-{seq_num:05}");
    let id = Uuid::new_v4();

    sqlx::query(
        r#"
        INSERT INTO recyclable_lots (id, lot_code, ward_id, material_type, estimated_kg, pickup_hub_bn, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'open')
        "#,
    )
    .bind(id)
    .bind(&lot_code)
    .bind(payload.ward_id)
    .bind(&payload.material_type)
    .bind(payload.estimated_kg)
    .bind(hub)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    let sql = format!("{LOT_SELECT_BASE} WHERE rl.id = $1");
    let created = sqlx::query_as::<_, RecyclableLotRecord>(&sql)
        .bind(id)
        .fetch_one(&state.pool)
        .await?;

    Ok((StatusCode::CREATED, Json(created)))
}

/// `POST /api/v1/partner/lots/:id/claim` (Verified Partner only)
/// Derives partner identity strictly from authenticated partner account (cannot spoof names).
#[utoipa::path(
    post,
    path = "/api/v1/partner/lots/{id}/claim",
    tag = "Partner",
    security(("bearerAuth" = [])),
    params(("id" = Uuid, Path, description = "Recyclable lot UUID")),
    request_body = Option<ClaimLotRequest>,
    responses(
        (status = 200, description = "Lot claimed by recycling partner", body = RecyclableLotRecord),
        (status = 409, description = "Lot already claimed", body = ErrorBody)
    )
)]
pub async fn claim_lot(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    payload: Option<Json<ClaimLotRequest>>,
) -> Result<Json<RecyclableLotRecord>, AppError> {
    let partner = require_role(&state, &headers, &[Role::Partner]).await?;

    let partner_id = partner.partner_id.ok_or_else(|| {
        AppError::forbidden(
            "Verified recycling partner organization not linked to your account.",
            "আপনার অ্যাকাউন্টের সাথে কোনো অনুমোদিত রিসাইক্লিং প্রতিষ্ঠান যুক্ত নেই।",
        )
    })?;
    let partner_name = partner
        .partner_name
        .clone()
        .unwrap_or_else(|| partner.display_label());
    let note = payload
        .map(|p| p.note_bn.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "পার্টনার রিসাইক্লিং লট বুক করেছেন".to_string());

    let mut tx = state.pool.begin().await?;

    let current_status: Option<String> =
        sqlx::query_scalar("SELECT status FROM recyclable_lots WHERE id = $1 FOR UPDATE")
            .bind(id)
            .fetch_optional(&mut *tx)
            .await?;

    let status = current_status
        .ok_or_else(|| AppError::not_found("Recyclable lot not found.", "লটটি খুঁজে পাওয়া যায়নি।"))?;

    if status != "open" {
        return Err(AppError::conflict(
            "This recyclable lot has already been claimed.",
            "এই লটটি ইতিমধ্যে অন্য পার্টনার বুক করেছেন।",
        ));
    }

    sqlx::query(
        r#"
        UPDATE recyclable_lots
        SET status = 'claimed',
            claimed_partner_id = $2,
            claimed_partner_name = $3,
            updated_at = NOW()
        WHERE id = $1
        "#,
    )
    .bind(id)
    .bind(partner_id)
    .bind(&partner_name)
    .execute(&mut *tx)
    .await?;

    sqlx::query(
        r#"
        INSERT INTO status_events (
            entity_type, entity_id, recyclable_lot_id, from_status, to_status,
            actor_user_id, actor_label, note_bn
        )
        VALUES ('recyclable_lot', $1, $1, 'open', 'claimed', $2, $3, $4)
        "#,
    )
    .bind(id)
    .bind(partner.user_id)
    .bind(&partner_name)
    .bind(&note)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    let sql = format!("{LOT_SELECT_BASE} WHERE rl.id = $1");
    let updated = sqlx::query_as::<_, RecyclableLotRecord>(&sql)
        .bind(id)
        .fetch_one(&state.pool)
        .await?;

    Ok(Json(updated))
}

/// `POST /api/v1/partner/lots/:id/collect` (Owning Partner or Admin)
/// Transitions a claimed lot to `'collected'`.
#[utoipa::path(
    post,
    path = "/api/v1/partner/lots/{id}/collect",
    tag = "Partner",
    security(("bearerAuth" = [])),
    params(("id" = Uuid, Path, description = "Recyclable lot UUID")),
    responses(
        (status = 200, description = "Lot marked collected", body = RecyclableLotRecord),
        (status = 403, description = "Forbidden", body = ErrorBody)
    )
)]
pub async fn collect_lot(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> Result<Json<RecyclableLotRecord>, AppError> {
    let auth_user = require_role(&state, &headers, &[Role::Partner, Role::Admin]).await?;

    let mut tx = state.pool.begin().await?;

    #[derive(sqlx::FromRow)]
    struct LotState {
        status: String,
        claimed_partner_id: Option<Uuid>,
    }

    let row = sqlx::query_as::<_, LotState>(
        "SELECT status, claimed_partner_id FROM recyclable_lots WHERE id = $1 FOR UPDATE",
    )
    .bind(id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(|| AppError::not_found("Recyclable lot not found.", "লটটি পাওয়া যায়নি।"))?;

    if auth_user.role == Role::Partner
        && (auth_user.partner_id.is_none() || row.claimed_partner_id != auth_user.partner_id)
    {
        return Err(AppError::forbidden(
            "Only the claiming partner or an admin can mark this lot collected.",
            "শুধুমাত্র বুকিংকারী পার্টনার অথবা অ্যাডমিন এই লটটি সংগ্রহ সম্পন্ন করতে পারবেন।",
        ));
    }

    if row.status != "claimed" {
        return Err(AppError::conflict(
            "Only claimed lots can be marked collected.",
            "শুধুমাত্র বুক করা লট সংগ্রহ সম্পন্ন হিসেবে চিহ্নিত করা যাবে।",
        ));
    }

    sqlx::query(
        r#"
        UPDATE recyclable_lots
        SET status = 'collected',
            collected_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
        "#,
    )
    .bind(id)
    .execute(&mut *tx)
    .await?;

    sqlx::query(
        r#"
        INSERT INTO status_events (
            entity_type, entity_id, recyclable_lot_id, from_status, to_status,
            actor_user_id, actor_label, note_bn
        )
        VALUES ('recyclable_lot', $1, $1, 'claimed', 'collected', $2, $3, 'রিসাইক্লিং লট সংগ্রহ সম্পন্ন হয়েছে')
        "#,
    )
    .bind(id)
    .bind(auth_user.user_id)
    .bind(auth_user.display_label())
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    let sql = format!("{LOT_SELECT_BASE} WHERE rl.id = $1");
    let updated = sqlx::query_as::<_, RecyclableLotRecord>(&sql)
        .bind(id)
        .fetch_one(&state.pool)
        .await?;

    Ok(Json(updated))
}
