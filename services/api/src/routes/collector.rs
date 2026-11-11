use axum::{
    body::Bytes,
    extract::{Path, State},
    http::{header::HeaderName, HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use chrono::Utc;
use sqlx::{Postgres, Transaction};
use uuid::Uuid;

use crate::{
    auth::{resolve_auth, AuthUser},
    db::AppState,
    error::AppError,
    models::{
        auth::UserRole,
        complaint::ComplaintStatus,
        pickup::PickupStatus,
        worker::{CompleteTaskRequest, CompleteTaskResponse, WorkerTaskType},
    },
};

const IDEMPOTENCY_HEADER: &str = "idempotency-key";
const REPLAY_HEADER_NAME: &str = "x-idempotent-replay";

/// `PATCH /api/v1/collector/tasks/:id/complete`
/// Idempotent task-completion endpoint backed by `Idempotency-Key` so offline mobile app
/// retries never duplicate completion records or double-mutate task state.
pub async fn complete_task(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(task_id): Path<Uuid>,
    body: Bytes,
) -> Result<Response, AppError> {
    let auth_user = resolve_auth(&state, &headers).await?;
    if let Some(ref user) = auth_user {
        if user.role == UserRole::Citizen {
            return Err(AppError::forbidden(
                "COLLECTOR_ROLE_REQUIRED",
                "Citizen accounts cannot complete collector tasks.",
            ));
        }
    }

    let idempotency_key = extract_idempotency_key(&headers)?;
    let payload: CompleteTaskRequest = if body.is_empty() {
        CompleteTaskRequest::default()
    } else {
        serde_json::from_slice(&body).map_err(|e| {
            AppError::validation("INVALID_JSON", format!("Malformed JSON body: {e}"))
        })?
    };

    validate_completion_payload(&payload)?;

    let scope = format!("PATCH:/collector/tasks/{task_id}/complete");
    let fingerprint = build_fingerprint(task_id, &payload);

    let mut tx = state.pool.begin().await?;

    let inserted_key: Option<Uuid> = sqlx::query_scalar(
        r#"
        INSERT INTO idempotency_keys (idempotency_key, request_scope, request_fingerprint)
        VALUES ($1, $2, $3)
        ON CONFLICT (idempotency_key, request_scope) DO NOTHING
        RETURNING id
        "#,
    )
    .bind(&idempotency_key)
    .bind(&scope)
    .bind(&fingerprint)
    .fetch_optional(&mut *tx)
    .await?;

    if inserted_key.is_none() {
        #[derive(sqlx::FromRow)]
        struct ExistingIdempotency {
            request_fingerprint: String,
            response_status: Option<i16>,
            response_body: Option<serde_json::Value>,
        }

        let existing = sqlx::query_as::<_, ExistingIdempotency>(
            r#"
            SELECT request_fingerprint, response_status, response_body
            FROM idempotency_keys
            WHERE idempotency_key = $1 AND request_scope = $2
            FOR UPDATE
            "#,
        )
        .bind(&idempotency_key)
        .bind(&scope)
        .fetch_one(&mut *tx)
        .await?;

        if existing.request_fingerprint != fingerprint {
            return Err(AppError::conflict(
                "IDEMPOTENCY_KEY_CONFLICT",
                "Idempotency-Key was already used with a different completion payload.",
            ));
        }

        let status = existing
            .response_status
            .and_then(|s| StatusCode::from_u16(s as u16).ok())
            .unwrap_or(StatusCode::OK);
        let stored_body = existing.response_body.ok_or_else(|| {
            AppError::conflict(
                "IDEMPOTENCY_IN_FLIGHT",
                "An identical completion request is currently in progress.",
            )
        })?;

        tx.commit().await?;
        return Ok((
            status,
            [(HeaderName::from_static(REPLAY_HEADER_NAME), "true")],
            Json(stored_body),
        )
            .into_response());
    }

    let actor_worker_id = resolve_actor_worker_id(&mut tx, auth_user.as_ref(), payload.worker_id).await?;
    let target = lock_target_task(&mut tx, task_id, payload.task_type).await?;
    let now = Utc::now();

    let response = match target {
        LockedTask::Pickup {
            tracking_code,
            status,
            assigned_worker_id,
            existing_weight_kg,
            existing_photo_url,
        } => {
            if matches!(status, PickupStatus::Completed | PickupStatus::Cancelled) {
                return Err(AppError::conflict(
                    "TASK_ALREADY_FINALIZED",
                    "This pickup task is already completed or cancelled.",
                ));
            }

            let final_worker_id = actor_worker_id.or(assigned_worker_id);
            let final_weight = payload.weight_kg.or(existing_weight_kg);
            let final_photo = payload
                .completion_photo_url
                .as_deref()
                .map(str::trim)
                .filter(|s| !s.is_empty())
                .map(str::to_string)
                .or(existing_photo_url);

            sqlx::query(
                r#"
                UPDATE pickup_requests
                SET status = 'completed',
                    weight_kg = $2,
                    completion_photo_url = $3,
                    assigned_worker_id = COALESCE($4, assigned_worker_id),
                    notes = CASE WHEN $5 <> '' THEN $5 ELSE notes END,
                    completed_at = $6,
                    updated_at = $6
                WHERE id = $1
                "#,
            )
            .bind(task_id)
            .bind(final_weight)
            .bind(&final_photo)
            .bind(final_worker_id)
            .bind(payload.notes.trim())
            .bind(now)
            .execute(&mut *tx)
            .await?;

            let completion_id: Uuid = sqlx::query_scalar(
                r#"
                INSERT INTO task_completions (
                    task_type, task_id, worker_id, idempotency_key,
                    weight_kg, photo_url, notes, completed_at
                )
                VALUES ('pickup', $1, $2, $3, $4, $5, $6, $7)
                RETURNING id
                "#,
            )
            .bind(task_id)
            .bind(final_worker_id)
            .bind(&idempotency_key)
            .bind(final_weight)
            .bind(&final_photo)
            .bind(payload.notes.trim())
            .bind(now)
            .fetch_one(&mut *tx)
            .await?;

            CompleteTaskResponse {
                completion_id,
                task_type: WorkerTaskType::Pickup,
                task_id,
                tracking_code,
                status: "completed".to_string(),
                worker_id: final_worker_id,
                weight_kg: final_weight,
                completion_photo_url: final_photo,
                completed_at: now,
                idempotency_key: idempotency_key.clone(),
            }
        }
        LockedTask::Complaint {
            tracking_code,
            status,
            assigned_worker_id,
            existing_photo_url,
        } => {
            if matches!(
                status,
                ComplaintStatus::Resolved | ComplaintStatus::Duplicate | ComplaintStatus::Rejected
            ) {
                return Err(AppError::conflict(
                    "TASK_ALREADY_FINALIZED",
                    "This complaint task is already resolved, duplicate, or rejected.",
                ));
            }

            let final_worker_id = actor_worker_id.or(assigned_worker_id);
            let final_photo = payload
                .completion_photo_url
                .as_deref()
                .map(str::trim)
                .filter(|s| !s.is_empty())
                .map(str::to_string)
                .or(existing_photo_url);

            sqlx::query(
                r#"
                UPDATE garbage_complaints
                SET status = 'resolved',
                    resolved_photo_url = $2,
                    assigned_worker_id = COALESCE($3, assigned_worker_id),
                    resolved_at = $4,
                    updated_at = $4
                WHERE id = $1
                "#,
            )
            .bind(task_id)
            .bind(&final_photo)
            .bind(final_worker_id)
            .bind(now)
            .execute(&mut *tx)
            .await?;

            let completion_id: Uuid = sqlx::query_scalar(
                r#"
                INSERT INTO task_completions (
                    task_type, task_id, worker_id, idempotency_key,
                    weight_kg, photo_url, notes, completed_at
                )
                VALUES ('complaint', $1, $2, $3, $4, $5, $6, $7)
                RETURNING id
                "#,
            )
            .bind(task_id)
            .bind(final_worker_id)
            .bind(&idempotency_key)
            .bind(payload.weight_kg)
            .bind(&final_photo)
            .bind(payload.notes.trim())
            .bind(now)
            .fetch_one(&mut *tx)
            .await?;

            CompleteTaskResponse {
                completion_id,
                task_type: WorkerTaskType::Complaint,
                task_id,
                tracking_code,
                status: "resolved".to_string(),
                worker_id: final_worker_id,
                weight_kg: payload.weight_kg,
                completion_photo_url: final_photo,
                completed_at: now,
                idempotency_key: idempotency_key.clone(),
            }
        }
    };

    let response_json =
        serde_json::to_value(&response).map_err(|e| AppError::internal(e.to_string()))?;

    sqlx::query(
        r#"
        UPDATE idempotency_keys
        SET response_status = 200,
            response_body = $3
        WHERE idempotency_key = $1 AND request_scope = $2
        "#,
    )
    .bind(&idempotency_key)
    .bind(&scope)
    .bind(&response_json)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok((
        StatusCode::OK,
        [(HeaderName::from_static(REPLAY_HEADER_NAME), "false")],
        Json(response_json),
    )
        .into_response())
}

enum LockedTask {
    Pickup {
        tracking_code: String,
        status: PickupStatus,
        assigned_worker_id: Option<Uuid>,
        existing_weight_kg: Option<f64>,
        existing_photo_url: Option<String>,
    },
    Complaint {
        tracking_code: String,
        status: ComplaintStatus,
        assigned_worker_id: Option<Uuid>,
        existing_photo_url: Option<String>,
    },
}

async fn lock_target_task(
    tx: &mut Transaction<'_, Postgres>,
    task_id: Uuid,
    hint: Option<WorkerTaskType>,
) -> Result<LockedTask, AppError> {
    #[derive(sqlx::FromRow)]
    struct PickupRow {
        tracking_code: String,
        status: PickupStatus,
        assigned_worker_id: Option<Uuid>,
        weight_kg: Option<f64>,
        completion_photo_url: Option<String>,
    }

    #[derive(sqlx::FromRow)]
    struct ComplaintRow {
        tracking_code: String,
        status: ComplaintStatus,
        assigned_worker_id: Option<Uuid>,
        resolved_photo_url: Option<String>,
    }

    if hint != Some(WorkerTaskType::Complaint) {
        if let Some(p) = sqlx::query_as::<_, PickupRow>(
            r#"
            SELECT tracking_code, status, assigned_worker_id, weight_kg, completion_photo_url
            FROM pickup_requests
            WHERE id = $1
            FOR UPDATE
            "#,
        )
        .bind(task_id)
        .fetch_optional(&mut **tx)
        .await?
        {
            return Ok(LockedTask::Pickup {
                tracking_code: p.tracking_code,
                status: p.status,
                assigned_worker_id: p.assigned_worker_id,
                existing_weight_kg: p.weight_kg,
                existing_photo_url: p.completion_photo_url,
            });
        }
    }

    if hint != Some(WorkerTaskType::Pickup) {
        if let Some(c) = sqlx::query_as::<_, ComplaintRow>(
            r#"
            SELECT tracking_code, status, assigned_worker_id, resolved_photo_url
            FROM garbage_complaints
            WHERE id = $1
            FOR UPDATE
            "#,
        )
        .bind(task_id)
        .fetch_optional(&mut **tx)
        .await?
        {
            return Ok(LockedTask::Complaint {
                tracking_code: c.tracking_code,
                status: c.status,
                assigned_worker_id: c.assigned_worker_id,
                existing_photo_url: c.resolved_photo_url,
            });
        }
    }

    Err(AppError::not_found(
        "TASK_NOT_FOUND",
        "No matching pickup request or garbage complaint found for this task ID.",
    ))
}

async fn resolve_actor_worker_id(
    tx: &mut Transaction<'_, Postgres>,
    auth_user: Option<&AuthUser>,
    explicit_worker_id: Option<Uuid>,
) -> Result<Option<Uuid>, AppError> {
    if let Some(wid) = explicit_worker_id {
        let exists: Option<Uuid> = sqlx::query_scalar("SELECT id FROM workers WHERE id = $1")
            .bind(wid)
            .fetch_optional(&mut **tx)
            .await?;
        if exists.is_none() {
            return Err(AppError::validation(
                "INVALID_WORKER_ID",
                "Specified worker_id does not exist.",
            ));
        }
        return Ok(Some(wid));
    }

    if let Some(user) = auth_user {
        let wid: Option<Uuid> =
            sqlx::query_scalar("SELECT id FROM workers WHERE user_id = $1")
                .bind(user.user_id)
                .fetch_optional(&mut **tx)
                .await?;
        return Ok(wid);
    }

    Ok(None)
}

fn extract_idempotency_key(headers: &HeaderMap) -> Result<String, AppError> {
    let raw = headers
        .get(IDEMPOTENCY_HEADER)
        .ok_or_else(|| {
            AppError::validation(
                "MISSING_IDEMPOTENCY_KEY",
                "Idempotency-Key header is required for task completion.",
            )
        })?
        .to_str()
        .map_err(|_| {
            AppError::validation(
                "INVALID_IDEMPOTENCY_KEY",
                "Idempotency-Key header must contain valid ASCII characters.",
            )
        })?
        .trim();

    if raw.is_empty() || raw.len() > 128 || !raw.chars().all(|c| c.is_ascii_graphic()) {
        return Err(AppError::validation(
            "INVALID_IDEMPOTENCY_KEY",
            "Idempotency-Key must be 1–128 visible ASCII characters without whitespace.",
        ));
    }

    Ok(raw.to_string())
}

fn validate_completion_payload(payload: &CompleteTaskRequest) -> Result<(), AppError> {
    if let Some(weight) = payload.weight_kg {
        if !weight.is_finite() || weight < 0.0 || weight > 10_000.0 {
            return Err(AppError::validation(
                "INVALID_WEIGHT",
                "weight_kg must be between 0 and 10000 kg.",
            ));
        }
    }

    if let Some(url) = payload
        .completion_photo_url
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
    {
        if url.len() > 2048
            || (!url.starts_with("http://") && !url.starts_with("https://") && !url.starts_with('/'))
        {
            return Err(AppError::validation(
                "INVALID_PHOTO_URL",
                "completion_photo_url must be a valid URL or path under 2048 chars.",
            ));
        }
    }

    Ok(())
}

fn build_fingerprint(task_id: Uuid, payload: &CompleteTaskRequest) -> String {
    let type_tag = match payload.task_type {
        Some(WorkerTaskType::Pickup) => "pickup",
        Some(WorkerTaskType::Complaint) => "complaint",
        None => "auto",
    };
    let worker_tag = payload
        .worker_id
        .map(|u| u.to_string())
        .unwrap_or_default();
    let weight_tag = payload
        .weight_kg
        .map(|w| format!("{w:.3}"))
        .unwrap_or_default();
    let photo_tag = payload
        .completion_photo_url
        .as_deref()
        .map(str::trim)
        .unwrap_or("");
    let canonical = format!(
        "{task_id}|{type_tag}|{worker_tag}|{weight_tag}|{photo_tag}|{}",
        payload.notes.trim()
    );
    fnv1a_128_hex(&canonical)
}

fn fnv1a_128_hex(input: &str) -> String {
    const OFFSET_BASIS: u128 = 0x6c62272e07bb0142_62b821756295c58d;
    const PRIME: u128 = 0x0000000001000000_000000000000013b;
    let mut hash = OFFSET_BASIS;
    for &byte in input.as_bytes() {
        hash ^= byte as u128;
        hash = hash.wrapping_mul(PRIME);
    }
    format!("{hash:032x}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fingerprint_is_deterministic_across_whitespace_and_equal_weights() {
        let id = Uuid::nil();
        let req1 = CompleteTaskRequest {
            task_type: Some(WorkerTaskType::Pickup),
            worker_id: None,
            weight_kg: Some(4.5),
            completion_photo_url: Some(" https://example.com/a.jpg ".to_string()),
            notes: " Done ".to_string(),
        };
        let req2 = CompleteTaskRequest {
            task_type: Some(WorkerTaskType::Pickup),
            worker_id: None,
            weight_kg: Some(4.500),
            completion_photo_url: Some("https://example.com/a.jpg".to_string()),
            notes: "Done".to_string(),
        };
        assert_eq!(build_fingerprint(id, &req1), build_fingerprint(id, &req2));
    }
}
