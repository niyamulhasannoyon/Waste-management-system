use axum::{
    extract::{Path, State},
    Json,
};
use uuid::Uuid;

use crate::{
    db::AppState,
    error::AppError,
    models::partner::{ClaimLotRequest, RecyclableLotRecord},
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
        rl.claimed_partner_name,
        rl.created_at
    FROM recyclable_lots rl
    JOIN wards w ON w.id = rl.ward_id
"#;

pub async fn list_lots(
    State(state): State<AppState>,
) -> Result<Json<Vec<RecyclableLotRecord>>, AppError> {
    let sql = format!("{LOT_SELECT_BASE} ORDER BY rl.created_at DESC");
    let rows = sqlx::query_as::<_, RecyclableLotRecord>(&sql)
        .fetch_all(&state.pool)
        .await?;
    Ok(Json(rows))
}

pub async fn claim_lot(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<ClaimLotRequest>,
) -> Result<Json<RecyclableLotRecord>, AppError> {
    if payload.partner_name.trim().len() < 2 {
        return Err(AppError::validation(
            "Partner name is required.",
            "পার্টনার প্রতিষ্ঠানের নাম লিখুন।",
        ));
    }

    let mut tx = state.pool.begin().await?;

    let current_status: Option<String> =
        sqlx::query_scalar("SELECT status FROM recyclable_lots WHERE id = $1 FOR UPDATE")
            .bind(id)
            .fetch_optional(&mut *tx)
            .await?;

    let status = current_status.ok_or_else(|| {
        AppError::not_found("Recyclable lot not found.", "লটটি খুঁজে পাওয়া যায়নি।")
    })?;

    if status != "open" {
        return Err(AppError::validation(
            "This recyclable lot has already been claimed.",
            "এই লটটি ইতিমধ্যে অন্য পার্টনার বুক করেছেন।",
        ));
    }

    sqlx::query(
        r#"
        UPDATE recyclable_lots
        SET status = 'claimed',
            claimed_partner_name = $2,
            updated_at = NOW()
        WHERE id = $1
        "#,
    )
    .bind(id)
    .bind(payload.partner_name.trim())
    .execute(&mut *tx)
    .await?;

    sqlx::query(
        r#"
        INSERT INTO status_events (entity_type, entity_id, from_status, to_status, actor_label, note_bn)
        VALUES ('recyclable_lot', $1, 'open', 'claimed', $2, 'পার্টনার রিসাইক্লিং লট বুক করেছেন')
        "#,
    )
    .bind(id)
    .bind(payload.partner_name.trim())
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
