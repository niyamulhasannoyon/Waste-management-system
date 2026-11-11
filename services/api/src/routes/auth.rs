use axum::{extract::State, http::StatusCode, Json};
use chrono::{Duration, Utc};

use crate::{
    auth::{constant_time_eq, generate_otp_code, generate_session_token},
    db::{ensure_zone_exists, normalize_bd_phone, AppState},
    error::AppError,
    models::auth::{
        OtpLoginRequest, OtpLoginResponse, OtpVerifyRequest, OtpVerifyResponse, UserRecord,
        UserRole,
    },
};

/// `POST /api/v1/auth/otp-login`
/// Validates a Bangladeshi `+8801...` phone number, creates/updates the user profile,
/// and issues a short-lived 6-digit OTP verification challenge.
pub async fn otp_login(
    State(state): State<AppState>,
    Json(payload): Json<OtpLoginRequest>,
) -> Result<(StatusCode, Json<OtpLoginResponse>), AppError> {
    let phone = normalize_bd_phone(&payload.phone)?;

    if let Some(ward_id) = payload.ward_id {
        ensure_zone_exists(&state.pool, ward_id).await?;
    }

    let full_name = payload.full_name.as_deref().unwrap_or("").trim();
    if full_name.len() > 120 {
        return Err(AppError::validation(
            "NAME_TOO_LONG",
            "full_name cannot exceed 120 characters.",
        ));
    }

    // Prevent self-escalation to dispatcher/admin via public OTP login.
    let requested_role = match payload.role {
        Some(UserRole::Admin) | Some(UserRole::Dispatcher) => {
            return Err(AppError::forbidden(
                "ROLE_NOT_ALLOWED",
                "Self-registration is restricted to citizen or collector accounts.",
            ));
        }
        Some(role) => role,
        None => UserRole::Citizen,
    };

    let mut tx = state.pool.begin().await?;

    // If phone matches a registered field worker, automatically assign collector role.
    let worker_exists: Option<uuid::Uuid> =
        sqlx::query_scalar("SELECT id FROM workers WHERE phone = $1")
            .bind(&phone)
            .fetch_optional(&mut *tx)
            .await?;

    let initial_role = if worker_exists.is_some() {
        UserRole::Collector
    } else {
        requested_role
    };

    sqlx::query(
        r#"
        INSERT INTO users (phone, full_name, role, ward_id)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (phone) DO UPDATE
        SET full_name = CASE WHEN $2 <> '' THEN $2 ELSE users.full_name END,
            ward_id = COALESCE($4, users.ward_id),
            updated_at = NOW()
        "#,
    )
    .bind(&phone)
    .bind(full_name)
    .bind(initial_role)
    .bind(payload.ward_id)
    .execute(&mut *tx)
    .await?;

    // Invalidate previous active OTPs for this phone so only the latest code is valid.
    sqlx::query(
        "UPDATE otp_codes SET consumed_at = NOW() WHERE phone = $1 AND consumed_at IS NULL",
    )
    .bind(&phone)
    .execute(&mut *tx)
    .await?;

    let otp = generate_otp_code();
    let ttl_seconds = state.config.otp_ttl_seconds;
    let expires_at = Utc::now() + Duration::seconds(ttl_seconds);

    sqlx::query(
        r#"
        INSERT INTO otp_codes (phone, code, expires_at)
        VALUES ($1, $2, $3)
        "#,
    )
    .bind(&phone)
    .bind(&otp)
    .bind(expires_at)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    tracing::info!(phone = %phone, "issued OTP challenge");

    Ok((
        StatusCode::OK,
        Json(OtpLoginResponse {
            phone,
            expires_in_seconds: ttl_seconds,
            message: "OTP generated for Bangladeshi mobile verification.",
            otp_preview: state.config.otp_dev_mode.then_some(otp),
        }),
    ))
}

/// `POST /api/v1/auth/verify`
/// Verifies the 6-digit OTP for a `+8801...` phone number and issues a Bearer session token.
pub async fn verify_otp(
    State(state): State<AppState>,
    Json(payload): Json<OtpVerifyRequest>,
) -> Result<Json<OtpVerifyResponse>, AppError> {
    let phone = normalize_bd_phone(&payload.phone)?;
    let otp_input = payload.otp.trim();

    if otp_input.len() != 6 || !otp_input.chars().all(|c| c.is_ascii_digit()) {
        return Err(AppError::validation(
            "INVALID_OTP_FORMAT",
            "OTP must be a 6-digit numeric code.",
        ));
    }

    let mut tx = state.pool.begin().await?;

    #[derive(sqlx::FromRow)]
    struct OtpRow {
        id: uuid::Uuid,
        code: String,
        attempts: i16,
    }

    let otp_row = sqlx::query_as::<_, OtpRow>(
        r#"
        SELECT id, code, attempts
        FROM otp_codes
        WHERE phone = $1
          AND consumed_at IS NULL
          AND expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE
        "#,
    )
    .bind(&phone)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(|| {
        AppError::unauthorized(
            "OTP_NOT_FOUND_OR_EXPIRED",
            "No active OTP found for this phone number. Request a new OTP.",
        )
    })?;

    if otp_row.attempts >= 5 {
        sqlx::query("UPDATE otp_codes SET consumed_at = NOW() WHERE id = $1")
            .bind(otp_row.id)
            .execute(&mut *tx)
            .await?;
        tx.commit().await?;
        return Err(AppError::too_many_requests(
            "OTP_MAX_ATTEMPTS",
            "Too many incorrect OTP attempts. Please request a new OTP.",
        ));
    }

    if !constant_time_eq(&otp_row.code, otp_input) {
        sqlx::query("UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1")
            .bind(otp_row.id)
            .execute(&mut *tx)
            .await?;
        tx.commit().await?;
        return Err(AppError::unauthorized(
            "INVALID_OTP",
            "Verification code does not match.",
        ));
    }

    sqlx::query("UPDATE otp_codes SET consumed_at = NOW() WHERE id = $1")
        .bind(otp_row.id)
        .execute(&mut *tx)
        .await?;

    let user = sqlx::query_as::<_, UserRecord>(
        r#"
        UPDATE users
        SET is_verified = TRUE, updated_at = NOW()
        WHERE phone = $1
        RETURNING id, phone, full_name, role, ward_id, is_verified, created_at
        "#,
    )
    .bind(&phone)
    .fetch_one(&mut *tx)
    .await?;

    // Link collector user account to matching worker profile if present.
    sqlx::query(
        "UPDATE workers SET user_id = $1, updated_at = NOW() WHERE phone = $2 AND user_id IS NULL",
    )
    .bind(user.id)
    .bind(&phone)
    .execute(&mut *tx)
    .await?;

    let token = generate_session_token();
    let session_ttl = state.config.session_ttl_seconds;
    let expires_at = Utc::now() + Duration::seconds(session_ttl);

    sqlx::query(
        r#"
        INSERT INTO auth_sessions (user_id, token, expires_at)
        VALUES ($1, $2, $3)
        "#,
    )
    .bind(user.id)
    .bind(&token)
    .bind(expires_at)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(Json(OtpVerifyResponse {
        access_token: token,
        token_type: "Bearer",
        expires_in_seconds: session_ttl,
        user,
    }))
}
