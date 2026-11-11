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
    auth::{require_role, AuthUser, Role},
    db::{
        create_notification, release_vehicle_if_idle, sha256_hex, validate_uploaded_photo_url,
        AppState,
    },
    error::AppError,
    models::dump_report::{
        CollectorSyncRequest, CompleteTaskRequest, CompleteTaskResponse, SyncBatchItem,
        SyncBatchResultItem,
    },
};

const IDEMPOTENCY_HEADER: &str = "idempotency-key";
const REPLAY_HEADER_NAME: &str = "x-idempotent-replay";

/// `PATCH /api/v1/collector/tasks/:id/complete` (or `POST`)
/// Idempotent collector task completion backed by SHA-256 request fingerprints and vehicle ownership checks.
pub async fn complete_task(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(task_id): Path<Uuid>,
    body: Bytes,
) -> Result<Response, AppError> {
    let auth_user = require_role(&state, &headers, &[Role::Collector, Role::Admin]).await?;
    let idempotency_key = extract_idempotency_key(&headers)?;

    let payload: CompleteTaskRequest = if body.is_empty() {
        CompleteTaskRequest::default()
    } else {
        serde_json::from_slice(&body).map_err(|e| {
            AppError::validation(
                format!("Malformed JSON body: {e}"),
                "অনুরোধের JSON ফরম্যাট সঠিক নয়।",
            )
        })?
    };

    let (response, is_replay) =
        execute_complete_task(&state, &auth_user, task_id, &idempotency_key, &payload).await?;

    let replay_val = if is_replay { "true" } else { "false" };
    Ok((
        StatusCode::OK,
        [(HeaderName::from_static(REPLAY_HEADER_NAME), replay_val)],
        Json(response),
    )
        .into_response())
}

/// `POST /api/v1/collector/sync`
/// Offline sync endpoint processing queued collector completions sequentially with per-item idempotency.
pub async fn sync_batch(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<CollectorSyncRequest>,
) -> Result<Json<Vec<SyncBatchResultItem>>, AppError> {
    let auth_user = require_role(&state, &headers, &[Role::Collector, Role::Admin]).await?;

    if payload.items.is_empty() || payload.items.len() > 50 {
        return Err(AppError::validation(
            "Batch sync requires between 1 and 50 items.",
            "একসাথে ১ থেকে ৫০টি অফলাইন কাজ সিঙ্ক করা যাবে।",
        ));
    }

    let mut results = Vec::with_capacity(payload.items.len());
    for item in payload.items {
        let result = process_sync_item(&state, &auth_user, item).await;
        results.push(result);
    }

    Ok(Json(results))
}

async fn process_sync_item(
    state: &AppState,
    auth_user: &AuthUser,
    item: SyncBatchItem,
) -> SyncBatchResultItem {
    let clean_key = item.idempotency_key.trim().to_string();
    if clean_key.is_empty()
        || clean_key.len() > 128
        || !clean_key.chars().all(|c| c.is_ascii_graphic())
    {
        return SyncBatchResultItem {
            idempotency_key: item.idempotency_key,
            task_id: item.task_id,
            ok: false,
            replay: false,
            error: Some("Invalid idempotency_key format.".to_string()),
            result: None,
        };
    }

    let req = CompleteTaskRequest {
        task_type: item.task_type,
        weight_kg: item.weight_kg,
        completion_photo_url: item.completion_photo_url,
        notes: item.notes,
    };

    match execute_complete_task(state, auth_user, item.task_id, &clean_key, &req).await {
        Ok((res, replay)) => SyncBatchResultItem {
            idempotency_key: clean_key,
            task_id: item.task_id,
            ok: true,
            replay,
            error: None,
            result: Some(res),
        },
        Err(err) => SyncBatchResultItem {
            idempotency_key: clean_key,
            task_id: item.task_id,
            ok: false,
            replay: false,
            error: Some(err.to_string()),
            result: None,
        },
    }
}

async fn execute_complete_task(
    state: &AppState,
    auth_user: &AuthUser,
    task_id: Uuid,
    idempotency_key: &str,
    payload: &CompleteTaskRequest,
) -> Result<(CompleteTaskResponse, bool), AppError> {
    validate_completion_payload(state, payload)?;

    let scope = format!("COMPLETE:{}:{task_id}", auth_user.user_id);
    let fingerprint = build_fingerprint(task_id, payload);

    let mut tx = state.pool.begin().await?;

    // Opportunistically purge expired idempotency entries.
    sqlx::query("DELETE FROM idempotency_keys WHERE expires_at < NOW()")
        .execute(&mut *tx)
        .await?;

    let inserted_key: Option<Uuid> = sqlx::query_scalar(
        r#"
        INSERT INTO idempotency_keys (user_id, idempotency_key, request_scope, request_fingerprint)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (idempotency_key, request_scope) DO NOTHING
        RETURNING id
        "#,
    )
    .bind(auth_user.user_id)
    .bind(idempotency_key)
    .bind(&scope)
    .bind(&fingerprint)
    .fetch_optional(&mut *tx)
    .await?;

    if inserted_key.is_none() {
        #[derive(sqlx::FromRow)]
        struct ExistingIdempotency {
            request_fingerprint: String,
            response_body: Option<serde_json::Value>,
        }

        let existing = sqlx::query_as::<_, ExistingIdempotency>(
            r#"
            SELECT request_fingerprint, response_body
            FROM idempotency_keys
            WHERE idempotency_key = $1 AND request_scope = $2
            FOR UPDATE
            "#,
        )
        .bind(idempotency_key)
        .bind(&scope)
        .fetch_one(&mut *tx)
        .await?;

        if existing.request_fingerprint != fingerprint {
            return Err(AppError::conflict(
                "Idempotency-Key already used with a different payload.",
                "একই Idempotency-Key দিয়ে ভিন্ন তথ্য পাঠানো যাবে না।",
            ));
        }

        let stored_body = existing.response_body.ok_or_else(|| {
            AppError::conflict(
                "Identical completion request already in flight.",
                "এই কাজটির সিঙ্ক বর্তমানে প্রক্রিয়াধীন রয়েছে।",
            )
        })?;

        let parsed: CompleteTaskResponse = serde_json::from_value(stored_body)
            .map_err(|e| AppError::Internal(format!("corrupt cached completion JSON: {e}")))?;

        tx.commit().await?;
        return Ok((parsed, true));
    }

    let target = lock_target_task(&mut tx, task_id, payload.task_type.as_deref()).await?;
    let now = Utc::now();
    let clean_photo = payload
        .completion_photo_url
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(|u| validate_uploaded_photo_url(u, &state.public_upload_base_url))
        .transpose()?;

    let response = match target {
        LockedTask::Pickup {
            tracking_code,
            status,
            user_id,
            assigned_vehicle_id,
            existing_weight_kg,
            existing_photo_url,
        } => {
            if matches!(status.as_str(), "collected" | "cancelled") {
                return Err(AppError::conflict(
                    "Pickup task is already completed or cancelled.",
                    "এই পিকআপ কাজটি ইতিমধ্যেই সম্পন্ন বা বাতিল হয়েছে।",
                ));
            }

            if auth_user.role == Role::Collector {
                let actor_vid = auth_user.vehicle_id.ok_or_else(|| {
                    AppError::forbidden(
                        "Collector account has no linked vehicle.",
                        "আপনার কালেক্টর অ্যাকাউন্টে কোনো গাড়ি সংযুক্ত নেই।",
                    )
                })?;
                if let Some(assigned) = assigned_vehicle_id {
                    if assigned != actor_vid {
                        return Err(AppError::forbidden(
                            "This pickup task is assigned to a different collector vehicle.",
                            "এই কাজটি অন্য গাড়ির জন্য নির্ধারিত।",
                        ));
                    }
                }
            }

            let final_vehicle_id = auth_user.vehicle_id.or(assigned_vehicle_id);
            let final_weight = payload.weight_kg.or(existing_weight_kg);
            let final_photo = clean_photo.or(existing_photo_url);

            sqlx::query(
                r#"
                UPDATE pickup_requests
                SET status = 'collected',
                    weight_kg = $2,
                    completion_photo_url = $3,
                    assigned_vehicle_id = COALESCE($4, assigned_vehicle_id),
                    notes = CASE WHEN $5 <> '' THEN $5 ELSE notes END,
                    completed_at = $6,
                    updated_at = $6
                WHERE id = $1
                "#,
            )
            .bind(task_id)
            .bind(final_weight)
            .bind(&final_photo)
            .bind(final_vehicle_id)
            .bind(payload.notes.trim())
            .bind(now)
            .execute(&mut *tx)
            .await?;

            release_vehicle_if_idle(&mut tx, final_vehicle_id).await?;

            let scoped_completion_key = sha256_hex(&format!("{scope}:{idempotency_key}"));

            let completion_id: Uuid = sqlx::query_scalar(
                r#"
                INSERT INTO task_completions (
                    task_type, task_id, pickup_id, vehicle_id, actor_user_id,
                    idempotency_key, weight_kg, photo_url, notes, completed_at
                )
                VALUES ('pickup', $1, $1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id
                "#,
            )
            .bind(task_id)
            .bind(final_vehicle_id)
            .bind(auth_user.user_id)
            .bind(&scoped_completion_key)
            .bind(final_weight)
            .bind(&final_photo)
            .bind(payload.notes.trim())
            .bind(now)
            .fetch_one(&mut *tx)
            .await?;

            sqlx::query(
                r#"
                INSERT INTO status_events (
                    entity_type, entity_id, pickup_id, from_status, to_status,
                    actor_user_id, actor_label, note_bn
                )
                VALUES ('pickup', $1, $1, $2, 'collected', $3, $4, $5)
                "#,
            )
            .bind(task_id)
            .bind(&status)
            .bind(auth_user.user_id)
            .bind(auth_user.display_label())
            .bind(if payload.notes.trim().is_empty() {
                "মাঠপর্যায়ে পিকআপ সংগ্রহ সম্পন্ন হয়েছে"
            } else {
                payload.notes.trim()
            })
            .execute(&mut *tx)
            .await?;

            let body_bn = format!("আপনার পিকআপ {tracking_code} সফলভাবে সংগ্রহ সম্পন্ন হয়েছে।");
            create_notification(
                &mut tx,
                user_id,
                "পিকআপ সংগ্রহ সম্পন্ন",
                &body_bn,
                "pickup",
                task_id,
            )
            .await?;

            CompleteTaskResponse {
                completion_id,
                task_type: "pickup".to_string(),
                task_id,
                tracking_code,
                status: "collected".to_string(),
                vehicle_id: final_vehicle_id,
                weight_kg: final_weight,
                completion_photo_url: final_photo,
                completed_at: now,
                idempotency_key: idempotency_key.to_string(),
            }
        }
        LockedTask::DumpReport {
            tracking_code,
            status,
            user_id,
            assigned_vehicle_id,
            existing_photo_url,
        } => {
            if matches!(status.as_str(), "cleared" | "rejected") {
                return Err(AppError::conflict(
                    "Dump report is already cleared or rejected.",
                    "এই রিপোর্টটি ইতিমধ্যেই পরিষ্কার বা বাতিল হয়েছে।",
                ));
            }

            if auth_user.role == Role::Collector {
                let actor_vid = auth_user.vehicle_id.ok_or_else(|| {
                    AppError::forbidden(
                        "Collector account has no linked vehicle.",
                        "আপনার কালেক্টর অ্যাকাউন্টে কোনো গাড়ি সংযুক্ত নেই।",
                    )
                })?;
                if let Some(assigned) = assigned_vehicle_id {
                    if assigned != actor_vid {
                        return Err(AppError::forbidden(
                            "This dump report is assigned to a different collector vehicle.",
                            "এই অভিযোগের কাজটি অন্য গাড়ির জন্য নির্ধারিত।",
                        ));
                    }
                }
            }

            let final_vehicle_id = auth_user.vehicle_id.or(assigned_vehicle_id);
            let final_photo = clean_photo.or(existing_photo_url);

            sqlx::query(
                r#"
                UPDATE dump_reports
                SET status = 'cleared',
                    resolved_photo_url = $2,
                    assigned_vehicle_id = COALESCE($3, assigned_vehicle_id),
                    cleared_at = $4,
                    updated_at = $4
                WHERE id = $1
                "#,
            )
            .bind(task_id)
            .bind(&final_photo)
            .bind(final_vehicle_id)
            .bind(now)
            .execute(&mut *tx)
            .await?;

            // Cascade clearance to clustered child duplicates.
            sqlx::query(
                r#"
                UPDATE dump_reports
                SET status = 'cleared',
                    resolved_photo_url = COALESCE($2, resolved_photo_url),
                    cleared_at = $3,
                    updated_at = $3
                WHERE duplicate_of = $1
                  AND status IN ('reported', 'verified', 'dispatched')
                "#,
            )
            .bind(task_id)
            .bind(&final_photo)
            .bind(now)
            .execute(&mut *tx)
            .await?;

            release_vehicle_if_idle(&mut tx, final_vehicle_id).await?;

            let scoped_completion_key = sha256_hex(&format!("{scope}:{idempotency_key}"));

            let completion_id: Uuid = sqlx::query_scalar(
                r#"
                INSERT INTO task_completions (
                    task_type, task_id, dump_report_id, vehicle_id, actor_user_id,
                    idempotency_key, weight_kg, photo_url, notes, completed_at
                )
                VALUES ('dump_report', $1, $1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id
                "#,
            )
            .bind(task_id)
            .bind(final_vehicle_id)
            .bind(auth_user.user_id)
            .bind(&scoped_completion_key)
            .bind(payload.weight_kg)
            .bind(&final_photo)
            .bind(payload.notes.trim())
            .bind(now)
            .fetch_one(&mut *tx)
            .await?;

            sqlx::query(
                r#"
                INSERT INTO status_events (
                    entity_type, entity_id, dump_report_id, from_status, to_status,
                    actor_user_id, actor_label, note_bn
                )
                VALUES ('dump_report', $1, $1, $2, 'cleared', $3, $4, $5)
                "#,
            )
            .bind(task_id)
            .bind(&status)
            .bind(auth_user.user_id)
            .bind(auth_user.display_label())
            .bind(if payload.notes.trim().is_empty() {
                "মাঠপর্যায়ে জায়গাটি পরিষ্কার করা হয়েছে"
            } else {
                payload.notes.trim()
            })
            .execute(&mut *tx)
            .await?;

            let body_bn = format!("আপনার অভিযোগ {tracking_code} পরিষ্কার সম্পন্ন হয়েছে।");
            create_notification(
                &mut tx,
                user_id,
                "জায়গাটি পরিষ্কার হয়েছে",
                &body_bn,
                "dump_report",
                task_id,
            )
            .await?;

            CompleteTaskResponse {
                completion_id,
                task_type: "dump_report".to_string(),
                task_id,
                tracking_code,
                status: "cleared".to_string(),
                vehicle_id: final_vehicle_id,
                weight_kg: payload.weight_kg,
                completion_photo_url: final_photo,
                completed_at: now,
                idempotency_key: idempotency_key.to_string(),
            }
        }
    };

    let response_json = serde_json::to_value(&response)
        .map_err(|e| AppError::Internal(format!("serialize completion: {e}")))?;

    sqlx::query(
        r#"
        UPDATE idempotency_keys
        SET response_status = 200,
            response_body = $3
        WHERE idempotency_key = $1 AND request_scope = $2
        "#,
    )
    .bind(idempotency_key)
    .bind(&scope)
    .bind(&response_json)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;
    Ok((response, false))
}

enum LockedTask {
    Pickup {
        tracking_code: String,
        status: String,
        user_id: Option<Uuid>,
        assigned_vehicle_id: Option<Uuid>,
        existing_weight_kg: Option<f64>,
        existing_photo_url: Option<String>,
    },
    DumpReport {
        tracking_code: String,
        status: String,
        user_id: Option<Uuid>,
        assigned_vehicle_id: Option<Uuid>,
        existing_photo_url: Option<String>,
    },
}

async fn lock_target_task(
    tx: &mut Transaction<'_, Postgres>,
    task_id: Uuid,
    hint: Option<&str>,
) -> Result<LockedTask, AppError> {
    if hint != Some("dump_report") {
        #[derive(sqlx::FromRow)]
        struct PickupRow {
            tracking_code: String,
            status: String,
            user_id: Option<Uuid>,
            assigned_vehicle_id: Option<Uuid>,
            weight_kg: Option<f64>,
            completion_photo_url: Option<String>,
        }
        if let Some(p) = sqlx::query_as::<_, PickupRow>(
            "SELECT tracking_code, status, user_id, assigned_vehicle_id, weight_kg, completion_photo_url FROM pickup_requests WHERE id = $1 FOR UPDATE",
        )
        .bind(task_id)
        .fetch_optional(&mut **tx)
        .await?
        {
            return Ok(LockedTask::Pickup {
                tracking_code: p.tracking_code,
                status: p.status,
                user_id: p.user_id,
                assigned_vehicle_id: p.assigned_vehicle_id,
                existing_weight_kg: p.weight_kg,
                existing_photo_url: p.completion_photo_url,
            });
        }
    }

    if hint != Some("pickup") {
        #[derive(sqlx::FromRow)]
        struct ReportRow {
            tracking_code: String,
            status: String,
            user_id: Option<Uuid>,
            assigned_vehicle_id: Option<Uuid>,
            resolved_photo_url: Option<String>,
        }
        if let Some(r) = sqlx::query_as::<_, ReportRow>(
            "SELECT tracking_code, status, user_id, assigned_vehicle_id, resolved_photo_url FROM dump_reports WHERE id = $1 FOR UPDATE",
        )
        .bind(task_id)
        .fetch_optional(&mut **tx)
        .await?
        {
            return Ok(LockedTask::DumpReport {
                tracking_code: r.tracking_code,
                status: r.status,
                user_id: r.user_id,
                assigned_vehicle_id: r.assigned_vehicle_id,
                existing_photo_url: r.resolved_photo_url,
            });
        }
    }

    Err(AppError::not_found(
        "No matching pickup request or dump report found.",
        "সংশ্লিষ্ট কাজটি খুঁজে পাওয়া যায়নি।",
    ))
}

fn extract_idempotency_key(headers: &HeaderMap) -> Result<String, AppError> {
    let raw = headers
        .get(IDEMPOTENCY_HEADER)
        .ok_or_else(|| {
            AppError::validation(
                "Idempotency-Key header is required.",
                "কাজ সম্পন্ন করতে Idempotency-Key হেডার প্রয়োজন।",
            )
        })?
        .to_str()
        .map_err(|_| {
            AppError::validation(
                "Idempotency-Key must be valid ASCII.",
                "Idempotency-Key সঠিক ফরম্যাটে নেই।",
            )
        })?
        .trim();

    if raw.is_empty() || raw.len() > 128 || !raw.chars().all(|c| c.is_ascii_graphic()) {
        return Err(AppError::validation(
            "Idempotency-Key must be 1–128 visible ASCII characters.",
            "Idempotency-Key ১–১২৮ অক্ষরের মধ্যে হতে হবে।",
        ));
    }

    Ok(raw.to_string())
}

fn validate_completion_payload(
    state: &AppState,
    payload: &CompleteTaskRequest,
) -> Result<(), AppError> {
    if let Some(ref tt) = payload.task_type {
        if !matches!(tt.as_str(), "pickup" | "dump_report") {
            return Err(AppError::validation(
                "task_type must be 'pickup' or 'dump_report'.",
                "সঠিক কাজের ধরন নির্বাচন করুন।",
            ));
        }
    }
    if let Some(w) = payload.weight_kg {
        if !w.is_finite() || w < 0.0 || w > 10_000.0 {
            return Err(AppError::validation(
                "weight_kg must be between 0 and 10000.",
                "বর্জ্যের ওজন ০ থেকে ১০,০০০ কেজির মধ্যে হতে হবে।",
            ));
        }
    }
    if payload.notes.trim().chars().count() > 500 {
        return Err(AppError::validation(
            "notes cannot exceed 500 characters.",
            "নোট ৫০০ অক্ষরের বেশি হওয়া যাবে না।",
        ));
    }
    if let Some(ref url) = payload.completion_photo_url {
        if !url.trim().is_empty() {
            validate_uploaded_photo_url(url, &state.public_upload_base_url)?;
        }
    }
    Ok(())
}

fn build_fingerprint(task_id: Uuid, payload: &CompleteTaskRequest) -> String {
    let type_tag = payload.task_type.as_deref().unwrap_or("auto");
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
        "{task_id}|{type_tag}|{weight_tag}|{photo_tag}|{}",
        payload.notes.trim()
    );
    sha256_hex(&canonical)
}
