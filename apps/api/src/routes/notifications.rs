use axum::{
    extract::{Path, State},
    http::HeaderMap,
    Json,
};
use uuid::Uuid;

use crate::{
    auth::require_auth,
    db::AppState,
    error::AppError,
    models::auth::NotificationRecord,
};

/// `GET /api/v1/notifications`
/// Lists recent status notifications strictly owned by the authenticated user.
pub async fn list_notifications(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<NotificationRecord>>, AppError> {
    let auth_user = require_auth(&state, &headers).await?;

    let rows = sqlx::query_as::<_, NotificationRecord>(
        r#"
        SELECT id, title_bn, body_bn, entity_type, entity_id, is_read, created_at
        FROM notifications
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 30
        "#,
    )
    .bind(auth_user.user_id)
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(rows))
}

/// `PATCH /api/v1/notifications/:id/read`
pub async fn mark_notification_read(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> Result<Json<NotificationRecord>, AppError> {
    let auth_user = require_auth(&state, &headers).await?;

    let updated = sqlx::query_as::<_, NotificationRecord>(
        r#"
        UPDATE notifications
        SET is_read = TRUE
        WHERE id = $1 AND user_id = $2
        RETURNING id, title_bn, body_bn, entity_type, entity_id, is_read, created_at
        "#,
    )
    .bind(id)
    .bind(auth_user.user_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| {
        AppError::not_found(
            "Notification not found.",
            "বিজ্ঞপ্তিটি খুঁজে পাওয়া যায়নি।",
        )
    })?;

    Ok(Json(updated))
}
