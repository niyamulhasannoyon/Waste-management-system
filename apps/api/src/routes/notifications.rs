use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    Json,
};
use uuid::Uuid;

use crate::{
    auth::require_auth,
    db::AppState,
    error::{AppError, ErrorBody},
    models::auth::{NotificationRecord, PaginationQuery},
};

/// `GET /api/v1/notifications`
/// Lists recent status notifications strictly owned by the authenticated user with bounded pagination.
#[utoipa::path(
    get,
    path = "/api/v1/notifications",
    tag = "Notifications",
    security(("bearerAuth" = [])),
    params(PaginationQuery),
    responses(
        (status = 200, description = "Paginated user notifications", body = Vec<NotificationRecord>),
        (status = 401, description = "Unauthorized", body = ErrorBody)
    )
)]
pub async fn list_notifications(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<PaginationQuery>,
) -> Result<Json<Vec<NotificationRecord>>, AppError> {
    let auth_user = require_auth(&state, &headers).await?;
    let limit = query.limit.unwrap_or(30).clamp(1, 100);
    let page = query.page.unwrap_or(1).max(1);
    let offset = (page - 1) * limit;

    let rows = sqlx::query_as::<_, NotificationRecord>(
        r#"
        SELECT id, title_bn, body_bn, entity_type, entity_id, is_read, created_at
        FROM notifications
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(auth_user.user_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(rows))
}

/// `PATCH /api/v1/notifications/:id/read`
#[utoipa::path(
    patch,
    path = "/api/v1/notifications/{id}/read",
    tag = "Notifications",
    security(("bearerAuth" = [])),
    params(("id" = Uuid, Path, description = "Notification UUID")),
    responses(
        (status = 200, description = "Updated notification record", body = NotificationRecord),
        (status = 404, description = "Notification not found", body = ErrorBody)
    )
)]
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
