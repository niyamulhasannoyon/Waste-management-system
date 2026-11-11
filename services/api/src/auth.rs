use axum::http::{header::AUTHORIZATION, HeaderMap};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    db::AppState,
    error::AppError,
    models::auth::UserRole,
};

/// Authenticated principal resolved from a Bearer session token.
#[derive(Debug, Clone)]
pub struct AuthUser {
    pub user_id: Uuid,
    pub phone: String,
    pub role: UserRole,
    pub ward_id: Option<i32>,
}

/// Parse and validate an optional `Authorization: Bearer <token>` header.
/// If no header is provided, returns `Ok(None)`. If provided, rejects invalid/expired tokens.
pub async fn extract_optional_auth(
    pool: &PgPool,
    headers: &HeaderMap,
) -> Result<Option<AuthUser>, AppError> {
    let Some(raw_header) = headers.get(AUTHORIZATION) else {
        return Ok(None);
    };

    let header_str = raw_header.to_str().map_err(|_| {
        AppError::unauthorized("INVALID_AUTH_HEADER", "Authorization header must be valid ASCII.")
    })?;

    let Some((scheme, token)) = header_str.trim().split_once(' ') else {
        return Err(AppError::unauthorized(
            "INVALID_AUTH_HEADER",
            "Authorization header must use 'Bearer <token>' format.",
        ));
    };

    if !scheme.eq_ignore_ascii_case("bearer") || token.trim().is_empty() {
        return Err(AppError::unauthorized(
            "INVALID_AUTH_HEADER",
            "Authorization header must use 'Bearer <token>' format.",
        ));
    }

    #[derive(sqlx::FromRow)]
    struct SessionRow {
        user_id: Uuid,
        phone: String,
        role: UserRole,
        ward_id: Option<i32>,
    }

    let row = sqlx::query_as::<_, SessionRow>(
        r#"
        SELECT u.id AS user_id, u.phone, u.role, u.ward_id
        FROM auth_sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token = $1
          AND s.revoked_at IS NULL
          AND s.expires_at > NOW()
        "#,
    )
    .bind(token.trim())
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| {
        AppError::unauthorized("INVALID_TOKEN", "Session token is invalid or expired.")
    })?;

    Ok(Some(AuthUser {
        user_id: row.user_id,
        phone: row.phone,
        role: row.role,
        ward_id: row.ward_id,
    }))
}

/// Enforce Bearer authentication when `REQUIRE_AUTH=true`, otherwise allow optional auth.
pub async fn resolve_auth(
    state: &AppState,
    headers: &HeaderMap,
) -> Result<Option<AuthUser>, AppError> {
    let user = extract_optional_auth(&state.pool, headers).await?;
    if state.config.require_auth && user.is_none() {
        return Err(AppError::unauthorized(
            "AUTH_REQUIRED",
            "Bearer authentication token is required.",
        ));
    }
    Ok(user)
}

/// Constant-time string comparison for OTP verification.
pub fn constant_time_eq(a: &str, b: &str) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut diff = 0u8;
    for (&x, &y) in a.as_bytes().iter().zip(b.as_bytes().iter()) {
        diff |= x ^ y;
    }
    diff == 0
}

/// Generate a 6-digit numeric OTP using CSPRNG-backed UUID v4 entropy.
pub fn generate_otp_code() -> String {
    let n = (Uuid::new_v4().as_u128() % 900_000) + 100_000;
    format!("{n:06}")
}

/// Generate a 256-bit CSPRNG-backed Bearer session token without external crypto crates.
pub fn generate_session_token() -> String {
    format!("cs_{}{}", Uuid::new_v4().simple(), Uuid::new_v4().simple())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn constant_time_compare_works() {
        assert!(constant_time_eq("123456", "123456"));
        assert!(!constant_time_eq("123456", "123457"));
        assert!(!constant_time_eq("123456", "12345"));
    }

    #[test]
    fn generated_otp_is_six_digits() {
        let otp = generate_otp_code();
        assert_eq!(otp.len(), 6);
        assert!(otp.chars().all(|c| c.is_ascii_digit()));
    }
}
