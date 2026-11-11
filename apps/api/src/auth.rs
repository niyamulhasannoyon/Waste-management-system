use axum::http::{header::AUTHORIZATION, HeaderMap};
use chrono::Utc;
use hmac::{Hmac, Mac};
use rand::{rngs::OsRng, RngCore};
use sha2::Sha256;
use sqlx::PgPool;
use std::collections::HashMap;
use std::fmt::Write as _;
use std::sync::Arc;
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::{db::AppState, error::AppError};

type HmacSha256 = Hmac<Sha256>;

/// Application user roles aligned with DB CHECK constraint.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Role {
    Citizen,
    Collector,
    Partner,
    Admin,
}

impl Role {
    pub fn from_db_str(raw: &str) -> Result<Self, AppError> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "citizen" => Ok(Self::Citizen),
            "collector" => Ok(Self::Collector),
            "partner" => Ok(Self::Partner),
            "admin" => Ok(Self::Admin),
            _ => Err(AppError::forbidden(
                "Unknown user role.",
                "ব্যবহারকারীর ভূমিকা সঠিক নয়।",
            )),
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Self::Citizen => "citizen",
            Self::Collector => "collector",
            Self::Partner => "partner",
            Self::Admin => "admin",
        }
    }
}

/// Verified principal extracted from an active Bearer session.
#[derive(Debug, Clone)]
pub struct AuthUser {
    pub user_id: Uuid,
    pub phone: String,
    pub full_name: String,
    pub role: Role,
    pub ward_id: Option<i16>,
    pub vehicle_id: Option<Uuid>,
    pub partner_id: Option<Uuid>,
    pub partner_name: Option<String>,
    pub token_hash: String,
}

impl AuthUser {
    pub fn display_label(&self) -> String {
        if !self.full_name.trim().is_empty() {
            self.full_name.trim().to_string()
        } else {
            self.phone.clone()
        }
    }
}

/// Thread-safe in-memory sliding-window rate limiter keyed by scope + client key.
#[derive(Clone, Default)]
pub struct RateLimiter {
    buckets: Arc<Mutex<HashMap<String, Vec<i64>>>>,
}

impl RateLimiter {
    pub async fn check(&self, key: &str, max_hits: usize, window_seconds: i64) -> Result<(), AppError> {
        let now = Utc::now().timestamp();
        let cutoff = now - window_seconds;
        let mut guard = self.buckets.lock().await;

        // Opportunistically prune stale keys if map grows beyond 4096 entries.
        if guard.len() > 4096 {
            guard.retain(|_, hits| hits.iter().any(|&ts| ts >= cutoff));
        }

        let hits = guard.entry(key.to_string()).or_default();
        hits.retain(|&ts| ts >= cutoff);

        if hits.len() >= max_hits {
            return Err(AppError::too_many_requests(
                "Too many requests. Please try again later.",
                "অতিরিক্ত অনুরোধ পাঠানো হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।",
            ));
        }

        hits.push(now);
        Ok(())
    }
}

/// Extract a client identifier for rate limiting (prefers left-most X-Forwarded-For / X-Real-IP).
pub fn extract_client_ip(headers: &HeaderMap) -> String {
    headers
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.split(',').next())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .or_else(|| headers.get("x-real-ip").and_then(|v| v.to_str().ok()).map(str::trim))
        .unwrap_or("unknown")
        .to_string()
}

/// Keyed HMAC-SHA256 hex digest for OTPs and session bearer tokens.
pub fn hmac_hash_hex(secret: &str, value: &str) -> String {
    let mut mac =
        HmacSha256::new_from_slice(secret.as_bytes()).expect("HMAC accepts keys of any length");
    mac.update(value.as_bytes());
    let digest = mac.finalize().into_bytes();
    let mut hex = String::with_capacity(64);
    for b in digest {
        let _ = write!(&mut hex, "{b:02x}");
    }
    hex
}

/// Constant-time comparison over equal-length strings.
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

/// CSPRNG 6-digit numeric OTP using uniform rejection sampling (no modulo bias).
pub fn generate_otp_code() -> String {
    loop {
        let candidate = OsRng.next_u32();
        let limit = (u32::MAX / 900_000) * 900_000;
        if candidate < limit {
            let code = (candidate % 900_000) + 100_000;
            return format!("{code:06}");
        }
    }
}

/// CSPRNG 256-bit Bearer session token (`cs_` prefix + 64 hex chars).
pub fn generate_session_token() -> String {
    let mut bytes = [0u8; 32];
    OsRng.fill_bytes(&mut bytes);
    let mut token = String::with_capacity(67);
    token.push_str("cs_");
    for b in bytes {
        let _ = write!(&mut token, "{b:02x}");
    }
    token
}

/// Extract an optional authenticated user; rejects malformed or invalid Bearer tokens.
pub async fn extract_optional_auth(
    state: &AppState,
    headers: &HeaderMap,
) -> Result<Option<AuthUser>, AppError> {
    let Some(raw_header) = headers.get(AUTHORIZATION) else {
        return Ok(None);
    };

    let header_str = raw_header.to_str().map_err(|_| {
        AppError::unauthorized(
            "Authorization header must contain valid ASCII.",
            "অনুমোদন হেডার সঠিক ফরম্যাটে নেই।",
        )
    })?;

    let Some((scheme, token)) = header_str.trim().split_once(' ') else {
        return Err(AppError::unauthorized(
            "Authorization header must use 'Bearer <token>' format.",
            "সঠিক সেশন টোকেন প্রদান করুন।",
        ));
    };

    if !scheme.eq_ignore_ascii_case("bearer") || token.trim().is_empty() {
        return Err(AppError::unauthorized(
            "Authorization header must use 'Bearer <token>' format.",
            "সঠিক সেশন টোকেন প্রদান করুন।",
        ));
    }

    let token_hash = hmac_hash_hex(&state.auth_secret, token.trim());
    let user = fetch_auth_user_by_token_hash(&state.pool, &token_hash).await?;
    Ok(Some(user))
}

/// Strictly require an authenticated session.
pub async fn require_auth(state: &AppState, headers: &HeaderMap) -> Result<AuthUser, AppError> {
    extract_optional_auth(state, headers).await?.ok_or_else(|| {
        AppError::unauthorized(
            "Authentication is required.",
            "এই কাজটি করতে অনুগ্রহ করে লগইন করুন।",
        )
    })
}

/// Enforce that the authenticated user holds one of `allowed_roles`.
pub async fn require_role(
    state: &AppState,
    headers: &HeaderMap,
    allowed_roles: &[Role],
) -> Result<AuthUser, AppError> {
    let user = require_auth(state, headers).await?;
    if !allowed_roles.contains(&user.role) {
        return Err(AppError::forbidden(
            "Your role does not have permission for this action.",
            "এই অংশে প্রবেশের অনুমতি আপনার অ্যাকাউন্টে নেই।",
        ));
    }
    Ok(user)
}

async fn fetch_auth_user_by_token_hash(pool: &PgPool, token_hash: &str) -> Result<AuthUser, AppError> {
    #[derive(sqlx::FromRow)]
    struct SessionRow {
        user_id: Uuid,
        phone: String,
        full_name: String,
        role: String,
        ward_id: Option<i16>,
        vehicle_id: Option<Uuid>,
        partner_id: Option<Uuid>,
        partner_name: Option<String>,
    }

    let row = sqlx::query_as::<_, SessionRow>(
        r#"
        SELECT
            u.id AS user_id,
            u.phone,
            u.full_name,
            u.role,
            u.ward_id,
            cv.id AS vehicle_id,
            p.id AS partner_id,
            p.organization_name AS partner_name
        FROM auth_sessions s
        JOIN users u ON u.id = s.user_id
        LEFT JOIN collector_vehicles cv ON cv.user_id = u.id
        LEFT JOIN partners p ON p.user_id = u.id
        WHERE s.token_hash = $1
          AND s.revoked_at IS NULL
          AND s.expires_at > NOW()
        "#,
    )
    .bind(token_hash)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| {
        AppError::unauthorized(
            "Session token is invalid or expired.",
            "আপনার লগইন সেশনের মেয়াদ শেষ হয়েছে। অনুগ্রহ করে আবার লগইন করুন।",
        )
    })?;

    let role = Role::from_db_str(&row.role)?;
    Ok(AuthUser {
        user_id: row.user_id,
        phone: row.phone,
        full_name: row.full_name,
        role,
        ward_id: row.ward_id,
        vehicle_id: row.vehicle_id,
        partner_id: row.partner_id,
        partner_name: row.partner_name,
        token_hash: token_hash.to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hmac_digest_is_64_hex_and_deterministic() {
        let a = hmac_hash_hex("secret-key-at-least-32-chars-long-here", "123456");
        let b = hmac_hash_hex("secret-key-at-least-32-chars-long-here", "123456");
        let c = hmac_hash_hex("different-secret-key-at-least-32-chars", "123456");
        assert_eq!(a.len(), 64);
        assert_eq!(a, b);
        assert_ne!(a, c);
    }

    #[test]
    fn otp_is_always_six_digits_and_token_is_long() {
        for _ in 0..50 {
            let otp = generate_otp_code();
            assert_eq!(otp.len(), 6);
            assert!(otp.chars().all(|ch| ch.is_ascii_digit()));
        }
        let tok = generate_session_token();
        assert!(tok.starts_with("cs_"));
        assert_eq!(tok.len(), 67);
    }
}
