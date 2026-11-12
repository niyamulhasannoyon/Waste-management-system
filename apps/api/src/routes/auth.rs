use axum::{
    extract::{Query, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use chrono::{Duration, Utc};
use uuid::Uuid;

use crate::{
    auth::{
        constant_time_eq, extract_client_ip, generate_otp_code, generate_session_token,
        hmac_hash_hex, require_auth, require_role, Role,
    },
    db::{ensure_ward_exists, mask_phone, normalize_bd_phone, record_audit_log, AppState},
    error::{AppError, ErrorBody},
    models::auth::{
        AccountEraseResponse, AuthenticatedProfile, OtpLoginRequest, OtpLoginResponse,
        OtpVerifyRequest, OtpVerifyResponse, RetentionPurgeQuery, RetentionPurgeResponse,
        UserRecord,
    },
};

/// `POST /api/v1/auth/otp-login`
/// Rate-limited phone OTP request. Does not mutate verified user records before OTP proof.
#[utoipa::path(
    post,
    path = "/api/v1/auth/otp-login",
    tag = "Auth",
    request_body = OtpLoginRequest,
    responses(
        (status = 200, description = "OTP issued", body = OtpLoginResponse),
        (status = 400, description = "Invalid phone or ward", body = ErrorBody),
        (status = 429, description = "Rate limit exceeded", body = ErrorBody)
    )
)]
pub async fn otp_login(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<OtpLoginRequest>,
) -> Result<(StatusCode, Json<OtpLoginResponse>), AppError> {
    let ip = extract_client_ip(&headers);
    state
        .rate_limiter
        .check(&format!("otp_login_ip:{ip}"), 20, 900)
        .await?;

    let phone = normalize_bd_phone(&payload.phone)?;
    state
        .rate_limiter
        .check(&format!("otp_login_phone:{phone}"), 5, 900)
        .await?;

    if let Some(ward_id) = payload.ward_id {
        ensure_ward_exists(&state.pool, ward_id).await?;
    }

    let pending_full_name = payload
        .full_name
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(str::to_string);

    if let Some(ref name) = pending_full_name {
        if name.chars().count() > 120 {
            return Err(AppError::validation(
                "Name cannot exceed 120 characters.",
                "নাম ১২০ অক্ষরের বেশি হওয়া যাবে না।",
            ));
        }
    }

    let pending_role = match payload.role.as_deref().map(str::trim) {
        None | Some("") | Some("citizen") => Some("citizen".to_string()),
        Some("collector") | Some("admin") | Some("partner") => {
            return Err(AppError::forbidden(
                "Privileged accounts cannot self-register via public OTP.",
                "কালেক্টর, অ্যাডমিন বা পার্টনার অ্যাকাউন্ট অনুমোদিত ফোন নম্বর দিয়ে লগইন করতে হবে।",
            ));
        }
        Some(_) => {
            return Err(AppError::validation(
                "Invalid role.",
                "সঠিক ব্যবহারকারীর ধরন নির্বাচন করুন।",
            ));
        }
    };

    let mut tx = state.pool.begin().await?;

    // Cooldown: prevent spamming or immediately re-issuing fresh OTPs after exhausting attempts.
    let recent_otp: Option<Uuid> = sqlx::query_scalar(
        r#"
        SELECT id
        FROM otp_codes
        WHERE phone = $1
          AND created_at > NOW() - INTERVAL '30 seconds'
        LIMIT 1
        "#,
    )
    .bind(&phone)
    .fetch_optional(&mut *tx)
    .await?;

    if recent_otp.is_some() {
        return Err(AppError::too_many_requests(
            "Please wait 30 seconds before requesting another OTP.",
            "নতুন ওটিপি চাইতে অনুগ্রহ করে ৩০ সেকেন্ড অপেক্ষা করুন।",
        ));
    }

    // Retire expired/old challenges and clean stale expired rows.
    sqlx::query(
        "UPDATE otp_codes SET consumed_at = NOW() WHERE phone = $1 AND consumed_at IS NULL",
    )
    .bind(&phone)
    .execute(&mut *tx)
    .await?;

    sqlx::query("DELETE FROM otp_codes WHERE expires_at < NOW() - INTERVAL '1 day'")
        .execute(&mut *tx)
        .await?;

    let otp = generate_otp_code();
    let otp_hash = hmac_hash_hex(&state.auth_secret, &format!("{phone}:{otp}"));
    let expires_at = Utc::now() + Duration::seconds(state.otp_ttl_seconds);

    sqlx::query(
        r#"
        INSERT INTO otp_codes (phone, otp_hash, pending_full_name, pending_ward_id, pending_role, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        "#,
    )
    .bind(&phone)
    .bind(&otp_hash)
    .bind(&pending_full_name)
    .bind(payload.ward_id)
    .bind(&pending_role)
    .bind(expires_at)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;
    tracing::info!(
        phone = %crate::db::mask_phone(&phone),
        "issued HMAC-hashed OTP challenge"
    );

    Ok((
        StatusCode::OK,
        Json(OtpLoginResponse {
            phone,
            expires_in_seconds: state.otp_ttl_seconds,
            message: "OTP challenge generated.",
            message_bn: "আপনার মোবাইলে ৬ সংখ্যার যাচাইকরণ কোড পাঠানো হয়েছে।",
            otp_preview: state.otp_dev_mode.then_some(otp),
        }),
    ))
}

/// `POST /api/v1/auth/otp-verify`
/// Verifies OTP against its HMAC digest, then creates/updates user & issues a hashed Bearer session.
#[utoipa::path(
    post,
    path = "/api/v1/auth/otp-verify",
    tag = "Auth",
    request_body = OtpVerifyRequest,
    responses(
        (status = 200, description = "OTP verified and bearer token issued", body = OtpVerifyResponse),
        (status = 401, description = "Invalid or expired OTP", body = ErrorBody),
        (status = 429, description = "Too many OTP attempts", body = ErrorBody)
    )
)]
pub async fn verify_otp(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<OtpVerifyRequest>,
) -> Result<Json<OtpVerifyResponse>, AppError> {
    let ip = extract_client_ip(&headers);
    state
        .rate_limiter
        .check(&format!("otp_verify_ip:{ip}"), 30, 900)
        .await?;

    let phone = normalize_bd_phone(&payload.phone)?;
    state
        .rate_limiter
        .check(&format!("otp_verify_phone:{phone}"), 10, 900)
        .await?;

    let otp_input = payload.otp.trim();
    if otp_input.len() != 6 || !otp_input.chars().all(|c| c.is_ascii_digit()) {
        return Err(AppError::validation(
            "OTP must be a 6-digit numeric code.",
            "৬ সংখ্যার সঠিক ওটিপি কোড দিন।",
        ));
    }

    let mut tx = state.pool.begin().await?;

    #[derive(sqlx::FromRow)]
    struct OtpRow {
        id: Uuid,
        otp_hash: String,
        pending_full_name: Option<String>,
        pending_ward_id: Option<i16>,
        attempts: i16,
    }

    let otp_row = sqlx::query_as::<_, OtpRow>(
        r#"
        SELECT id, otp_hash, pending_full_name, pending_ward_id, attempts
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
            "No active OTP found or OTP expired.",
            "সক্রিয় ওটিপি পাওয়া যায়নি বা মেয়াদ শেষ হয়েছে। নতুন ওটিপি নিন।",
        )
    })?;

    if otp_row.attempts >= 5 {
        sqlx::query("UPDATE otp_codes SET consumed_at = NOW() WHERE id = $1")
            .bind(otp_row.id)
            .execute(&mut *tx)
            .await?;
        record_audit_log(
            &mut *tx,
            None,
            None,
            "otp_lockout",
            Some("otp_code"),
            Some(otp_row.id),
            Some(&ip),
            serde_json::json!({ "masked_phone": mask_phone(&phone) }),
        )
        .await?;
        tx.commit().await?;
        return Err(AppError::too_many_requests(
            "Too many incorrect OTP attempts. Request a new OTP.",
            "অনেকবার ভুল ওটিপি দেওয়া হয়েছে। অনুগ্রহ করে নতুন ওটিপি নিন।",
        ));
    }

    let expected_hash = hmac_hash_hex(&state.auth_secret, &format!("{phone}:{otp_input}"));
    if !constant_time_eq(&otp_row.otp_hash, &expected_hash) {
        sqlx::query("UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1")
            .bind(otp_row.id)
            .execute(&mut *tx)
            .await?;
        record_audit_log(
            &mut *tx,
            None,
            None,
            "otp_failed",
            Some("otp_code"),
            Some(otp_row.id),
            Some(&ip),
            serde_json::json!({
                "masked_phone": mask_phone(&phone),
                "attempt": otp_row.attempts + 1,
            }),
        )
        .await?;
        tx.commit().await?;
        return Err(AppError::unauthorized(
            "Verification code does not match.",
            "প্রদত্ত ওটিপি কোডটি সঠিক নয়।",
        ));
    }

    sqlx::query("UPDATE otp_codes SET consumed_at = NOW() WHERE id = $1")
        .bind(otp_row.id)
        .execute(&mut *tx)
        .await?;

    // Resolve authoritative role from verified staff/partner tables before fallback to pending role.
    let is_bootstrap_admin = state.admin_bootstrap_phones.iter().any(|p| p == &phone);
    let existing_user_role: Option<String> =
        sqlx::query_scalar("SELECT role FROM users WHERE phone = $1")
            .bind(&phone)
            .fetch_optional(&mut *tx)
            .await?;

    let is_vehicle_collector: bool = sqlx::query_scalar::<_, Uuid>(
        "SELECT id FROM collector_vehicles WHERE driver_phone = $1 LIMIT 1",
    )
    .bind(&phone)
    .fetch_optional(&mut *tx)
    .await?
    .is_some();

    let is_verified_partner: bool = sqlx::query_scalar::<_, Uuid>(
        "SELECT id FROM partners WHERE contact_phone = $1 LIMIT 1",
    )
    .bind(&phone)
    .fetch_optional(&mut *tx)
    .await?
    .is_some();

    let resolved_role = if is_bootstrap_admin || existing_user_role.as_deref() == Some("admin") {
        Role::Admin.as_str()
    } else if is_vehicle_collector || existing_user_role.as_deref() == Some("collector") {
        Role::Collector.as_str()
    } else if is_verified_partner || existing_user_role.as_deref() == Some("partner") {
        Role::Partner.as_str()
    } else {
        Role::Citizen.as_str()
    };

    let clean_name = otp_row.pending_full_name.unwrap_or_default();

    let user = sqlx::query_as::<_, UserRecord>(
        r#"
        INSERT INTO users (phone, full_name, role, ward_id, is_verified)
        VALUES ($1, $2, $3, $4, TRUE)
        ON CONFLICT (phone) DO UPDATE
        SET full_name = CASE WHEN EXCLUDED.full_name <> '' THEN EXCLUDED.full_name ELSE users.full_name END,
            ward_id = COALESCE(EXCLUDED.ward_id, users.ward_id),
            role = EXCLUDED.role,
            is_verified = TRUE,
            updated_at = NOW()
        RETURNING id, phone, full_name, role, ward_id, is_verified, created_at
        "#,
    )
    .bind(&phone)
    .bind(&clean_name)
    .bind(resolved_role)
    .bind(otp_row.pending_ward_id)
    .fetch_one(&mut *tx)
    .await?;

    // Link collector/partner records if unassigned.
    let vehicle_id: Option<Uuid> = sqlx::query_scalar(
        "UPDATE collector_vehicles SET user_id = $1, updated_at = NOW() WHERE driver_phone = $2 AND (user_id IS NULL OR user_id = $1) RETURNING id",
    )
    .bind(user.id)
    .bind(&phone)
    .fetch_optional(&mut *tx)
    .await?;

    #[derive(sqlx::FromRow)]
    struct LinkedPartner {
        id: Uuid,
        organization_name: String,
    }

    let partner = sqlx::query_as::<_, LinkedPartner>(
        "UPDATE partners SET user_id = $1 WHERE contact_phone = $2 AND (user_id IS NULL OR user_id = $1) RETURNING id, organization_name",
    )
    .bind(user.id)
    .bind(&phone)
    .fetch_optional(&mut *tx)
    .await?;

    let token = generate_session_token();
    let token_hash = hmac_hash_hex(&state.auth_secret, &token);
    let expires_at = Utc::now() + Duration::seconds(state.session_ttl_seconds);

    sqlx::query("DELETE FROM auth_sessions WHERE expires_at < NOW()")
        .execute(&mut *tx)
        .await?;

    sqlx::query(
        r#"
        INSERT INTO auth_sessions (user_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
        "#,
    )
    .bind(user.id)
    .bind(&token_hash)
    .bind(expires_at)
    .execute(&mut *tx)
    .await?;

    record_audit_log(
        &mut *tx,
        Some(user.id),
        Some(user.role.as_str()),
        "otp_verified",
        Some("user"),
        Some(user.id),
        Some(&ip),
        serde_json::json!({ "masked_phone": mask_phone(&phone) }),
    )
    .await?;

    tx.commit().await?;

    Ok(Json(OtpVerifyResponse {
        access_token: token,
        token_type: "Bearer",
        expires_in_seconds: state.session_ttl_seconds,
        profile: AuthenticatedProfile {
            user,
            vehicle_id,
            partner_id: partner.as_ref().map(|p| p.id),
            partner_name: partner.map(|p| p.organization_name),
        },
    }))
}

/// `GET /api/v1/auth/me`
#[utoipa::path(
    get,
    path = "/api/v1/auth/me",
    tag = "Auth",
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "Authenticated user profile", body = AuthenticatedProfile),
        (status = 401, description = "Unauthorized", body = ErrorBody)
    )
)]
pub async fn me(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<AuthenticatedProfile>, AppError> {
    let auth_user = require_auth(&state, &headers).await?;

    let user = sqlx::query_as::<_, UserRecord>(
        "SELECT id, phone, full_name, role, ward_id, is_verified, created_at FROM users WHERE id = $1",
    )
    .bind(auth_user.user_id)
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(AuthenticatedProfile {
        user,
        vehicle_id: auth_user.vehicle_id,
        partner_id: auth_user.partner_id,
        partner_name: auth_user.partner_name,
    }))
}

/// `POST /api/v1/auth/logout`
#[utoipa::path(
    post,
    path = "/api/v1/auth/logout",
    tag = "Auth",
    security(("bearerAuth" = [])),
    responses(
        (status = 204, description = "Session revoked"),
        (status = 401, description = "Unauthorized", body = ErrorBody)
    )
)]
pub async fn logout(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<StatusCode, AppError> {
    let auth_user = require_auth(&state, &headers).await?;
    let ip = extract_client_ip(&headers);

    sqlx::query("UPDATE auth_sessions SET revoked_at = NOW() WHERE token_hash = $1")
        .bind(&auth_user.token_hash)
        .execute(&state.pool)
        .await?;

    record_audit_log(
        &state.pool,
        Some(auth_user.user_id),
        Some(auth_user.role.as_str()),
        "session_logout",
        Some("user"),
        Some(auth_user.user_id),
        Some(&ip),
        serde_json::json!({}),
    )
    .await?;

    Ok(StatusCode::NO_CONTENT)
}

/// `POST /api/v1/auth/erase`
/// Anonymizes the authenticated user's PII across profile, pickup requests, and dump reports,
/// snaps pickup coordinates to ward centroid, and revokes all active bearer sessions.
#[utoipa::path(
    post,
    path = "/api/v1/auth/erase",
    tag = "Auth",
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "Account anonymized and active sessions revoked", body = AccountEraseResponse),
        (status = 403, description = "Forbidden for admin self-erasure", body = ErrorBody)
    )
)]
pub async fn erase_account(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<AccountEraseResponse>, AppError> {
    let auth_user = require_auth(&state, &headers).await?;
    if auth_user.role == Role::Admin {
        return Err(AppError::forbidden(
            "Administrator accounts cannot self-erase directly.",
            "অ্যাডমিন অ্যাকাউন্ট সরাসরি মুছে ফেলা যাবে না; আগে দায়িত্ব হস্তান্তর করুন।",
        ));
    }

    let ip = extract_client_ip(&headers);
    let mut tx = state.pool.begin().await?;

    // Unlink any assigned fleet/partner references before anonymizing user identity.
    sqlx::query("UPDATE collector_vehicles SET user_id = NULL, updated_at = NOW() WHERE user_id = $1")
        .bind(auth_user.user_id)
        .execute(&mut *tx)
        .await?;
    sqlx::query("UPDATE partners SET user_id = NULL WHERE user_id = $1")
        .bind(auth_user.user_id)
        .execute(&mut *tx)
        .await?;

    let anonymized_pickups = sqlx::query(
        r#"
        UPDATE pickup_requests
        SET citizen_name = 'Anonymous',
            citizen_phone = '00000-000000',
            address_line = 'Anonymized',
            landmark = '',
            notes = '',
            location = w.centroid,
            anonymized_at = NOW(),
            updated_at = NOW()
        FROM wards w
        WHERE w.id = pickup_requests.ward_id
          AND pickup_requests.user_id = $1
          AND pickup_requests.anonymized_at IS NULL
        "#,
    )
    .bind(auth_user.user_id)
    .execute(&mut *tx)
    .await?
    .rows_affected();

    let anonymized_reports = sqlx::query(
        r#"
        UPDATE dump_reports
        SET reporter_name = '',
            reporter_phone = '00000-000000',
            location = w.centroid,
            anonymized_at = NOW(),
            updated_at = NOW()
        FROM wards w
        WHERE w.id = dump_reports.ward_id
          AND dump_reports.user_id = $1
          AND dump_reports.anonymized_at IS NULL
        "#,
    )
    .bind(auth_user.user_id)
    .execute(&mut *tx)
    .await?
    .rows_affected();

    sqlx::query("DELETE FROM notifications WHERE user_id = $1")
        .bind(auth_user.user_id)
        .execute(&mut *tx)
        .await?;

    sqlx::query("DELETE FROM otp_codes WHERE phone = $1")
        .bind(&auth_user.phone)
        .execute(&mut *tx)
        .await?;

    sqlx::query("UPDATE auth_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL")
        .bind(auth_user.user_id)
        .execute(&mut *tx)
        .await?;

    sqlx::query(
        r#"
        UPDATE users
        SET phone = LEFT('del-' || REPLACE(id::text, '-', ''), 20),
            full_name = 'মুছে ফেলা ব্যবহারকারী',
            is_verified = FALSE,
            anonymized_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
        "#,
    )
    .bind(auth_user.user_id)
    .execute(&mut *tx)
    .await?;

    record_audit_log(
        &mut *tx,
        Some(auth_user.user_id),
        Some(auth_user.role.as_str()),
        "account_erased",
        Some("user"),
        Some(auth_user.user_id),
        Some(&ip),
        serde_json::json!({
            "anonymized_pickups": anonymized_pickups,
            "anonymized_reports": anonymized_reports,
        }),
    )
    .await?;

    tx.commit().await?;

    Ok(Json(AccountEraseResponse {
        erased_user_id: auth_user.user_id,
        anonymized_pickups,
        anonymized_reports,
        message: "Personal data has been anonymized and active sessions revoked.",
        message_bn: "আপনার ব্যক্তিগত তথ্য নিরাপদভাবে মুছে ফেলা হয়েছে এবং সেশন বাতিল করা হয়েছে।",
    }))
}

/// `POST /api/v1/admin/retention/purge` (Admin only)
/// Runs expired OTP/session cleanup and PII anonymization using `purge_expired_pii`.
#[utoipa::path(
    post,
    path = "/api/v1/admin/retention/purge",
    tag = "Admin",
    security(("bearerAuth" = [])),
    params(RetentionPurgeQuery),
    responses(
        (status = 200, description = "Expired PII anonymized/purged", body = RetentionPurgeResponse),
        (status = 403, description = "Admin access required", body = ErrorBody)
    )
)]
pub async fn purge_retention(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<RetentionPurgeQuery>,
) -> Result<Json<RetentionPurgeResponse>, AppError> {
    let admin = require_role(&state, &headers, &[Role::Admin]).await?;
    let ip = extract_client_ip(&headers);
    let days = query.retention_days.unwrap_or(365).clamp(30, 3650);

    let result = sqlx::query_as::<_, RetentionPurgeResponse>(
        "SELECT purged_otps, purged_sessions, purged_idempotency, anonymized_pickups, anonymized_reports FROM purge_expired_pii($1)",
    )
    .bind(days)
    .fetch_one(&state.pool)
    .await?;

    record_audit_log(
        &state.pool,
        Some(admin.user_id),
        Some(admin.role.as_str()),
        "retention_purge",
        None,
        None,
        Some(&ip),
        serde_json::json!({
            "retention_days": days,
            "purged_otps": result.purged_otps,
            "purged_sessions": result.purged_sessions,
            "purged_idempotency": result.purged_idempotency,
            "anonymized_pickups": result.anonymized_pickups,
            "anonymized_reports": result.anonymized_reports,
        }),
    )
    .await?;

    Ok(Json(result))
}
