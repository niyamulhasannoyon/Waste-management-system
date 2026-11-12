use rand::{rngs::OsRng, RngCore};
use sha2::{Digest, Sha256};
use sqlx::{postgres::PgPoolOptions, PgPool, Postgres, Transaction};
use std::{fmt::Write as _, net::IpAddr};
use uuid::Uuid;

use crate::{auth::RateLimiter, config::AppConfig, error::AppError};

/// Shared application state injected into Axum handlers.
#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub upload_dir: String,
    pub public_upload_base_url: String,
    pub max_upload_bytes: usize,
    pub trusted_proxy_ips: Vec<IpAddr>,
    pub auth_secret: String,
    pub otp_dev_mode: bool,
    pub otp_ttl_seconds: i64,
    pub session_ttl_seconds: i64,
    pub duplicate_radius_meters: f64,
    pub nearby_default_radius_meters: f64,
    pub admin_bootstrap_phones: Vec<String>,
    pub rate_limiter: RateLimiter,
}

impl AppState {
    pub fn from_parts(pool: PgPool, cfg: &AppConfig) -> Self {
        let normalized_admins = cfg
            .admin_bootstrap_phones
            .iter()
            .filter_map(|p| normalize_bd_phone(p).ok())
            .collect();

        Self {
            pool,
            upload_dir: cfg.upload_dir.clone(),
            public_upload_base_url: cfg.public_upload_base_url.clone(),
            max_upload_bytes: cfg.max_upload_bytes,
            trusted_proxy_ips: cfg.trusted_proxy_ips.clone(),
            auth_secret: cfg.auth_secret.clone(),
            otp_dev_mode: cfg.otp_dev_mode,
            otp_ttl_seconds: cfg.otp_ttl_seconds,
            session_ttl_seconds: cfg.session_ttl_seconds,
            duplicate_radius_meters: cfg.duplicate_radius_meters,
            nearby_default_radius_meters: cfg.nearby_default_radius_meters,
            admin_bootstrap_phones: normalized_admins,
            rate_limiter: RateLimiter::default(),
        }
    }
}

/// Create the PostgreSQL connection pool and run embedded SQL migrations.
pub async fn init_pool(database_url: &str) -> Result<PgPool, sqlx::Error> {
    let pool = PgPoolOptions::new()
        .max_connections(20)
        .connect(database_url)
        .await?;

    sqlx::migrate!("./migrations").run(&pool).await?;
    Ok(pool)
}

/// Resolve a GPS coordinate (`lat`, `lng`) to a Savar ward/union ID in one query:
/// exact PostGIS `ST_Contains` match takes precedence over nearest centroid fallback.
pub async fn resolve_ward_id_and_match(
    pool: &PgPool,
    lat: f64,
    lng: f64,
) -> Result<(i16, bool), AppError> {
    #[derive(sqlx::FromRow)]
    struct ResolvedRow {
        id: i16,
        exact_match: bool,
    }

    let resolved = sqlx::query_as::<_, ResolvedRow>(
        r#"
        SELECT
            id,
            ST_Contains(boundary, ST_SetSRID(ST_MakePoint($1, $2), 4326)) AS exact_match
        FROM wards
        WHERE is_active = TRUE
        ORDER BY
            exact_match DESC,
            CASE WHEN zone_type = 'municipality_ward' THEN 0 ELSE 1 END ASC,
            centroid <-> ST_SetSRID(ST_MakePoint($1, $2), 4326) ASC,
            id ASC
        LIMIT 1
        "#,
    )
    .bind(lng)
    .bind(lat)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| {
        AppError::not_found(
            "No active Savar ward or union configured.",
            "সাভারের কোনো সক্রিয় ওয়ার্ড বা ইউনিয়ন পাওয়া যায়নি।",
        )
    })?;

    Ok((resolved.id, resolved.exact_match))
}

/// Ensure the given active ward/union exists.
pub async fn ensure_ward_exists(pool: &PgPool, ward_id: i16) -> Result<(), AppError> {
    let exists: Option<i16> =
        sqlx::query_scalar("SELECT id FROM wards WHERE id = $1 AND is_active = TRUE")
            .bind(ward_id)
            .fetch_optional(pool)
            .await?;

    if exists.is_none() {
        return Err(AppError::validation(
            "Selected Savar ward or union does not exist.",
            "সঠিক সাভার ওয়ার্ড বা ইউনিয়ন নির্বাচন করুন।",
        ));
    }

    Ok(())
}

/// Validate and normalize Bangladeshi mobile numbers (01[3-9]XXXXXXXX -> 01XXX-XXXXXX).
pub fn normalize_bd_phone(raw: &str) -> Result<String, AppError> {
    let digits: String = raw.chars().filter(|c| c.is_ascii_digit()).collect();
    let normalized = if digits.starts_with("8801") && digits.len() == 13 {
        format!("0{}", &digits[3..])
    } else if digits.starts_with("01") && digits.len() == 11 {
        digits
    } else {
        return Err(AppError::validation(
            "Phone number must be a valid 11-digit Bangladeshi mobile number starting with 01.",
            "সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন (যেমন: 01715883210)।",
        ));
    };

    let third_digit = normalized.as_bytes()[2];
    if !(b'3'..=b'9').contains(&third_digit) {
        return Err(AppError::validation(
            "Mobile operator prefix must start with 013–019.",
            "সঠিক বাংলাদেশি মোবাইল অপারেটর নম্বর দিন (০১৩ থেকে ০১৯ দিয়ে শুরু)।",
        ));
    }

    Ok(format!("{}-{}", &normalized[..5], &normalized[5..]))
}

/// Mask a phone number for unauthenticated public tracking (`01715-883210` -> `01715-••••10`).
pub fn mask_phone(phone: &str) -> String {
    let trimmed = phone.trim();
    if trimmed.len() >= 12 {
        let prefix = &trimmed[..6];
        let suffix = &trimmed[trimmed.len() - 2..];
        format!("{prefix}••••{suffix}")
    } else {
        "••••••".to_string()
    }
}

/// Validate GPS coordinates inside Savar Upazila bounds (23.72..=24.04 N, 90.15..=90.38 E).
pub fn validate_coords(lat: f64, lng: f64) -> Result<(), AppError> {
    if !lat.is_finite()
        || !lng.is_finite()
        || !(23.72..=24.04).contains(&lat)
        || !(90.15..=90.38).contains(&lng)
    {
        return Err(AppError::validation(
            "GPS coordinates are outside Savar Pourashava & Upazila service bounds.",
            "লোকেশন কোঅর্ডিনেট সাভার পৌরসভা ও উপজেলার সীমানার বাইরে। সঠিক পিন দিন।",
        ));
    }
    Ok(())
}

/// Validate that submitted photo URLs belong strictly to our sanitized `/uploads/<uuid>.(jpg|png)` store.
pub fn validate_uploaded_photo_url(
    raw: &str,
    public_upload_base_url: &str,
) -> Result<String, AppError> {
    let trimmed = raw.trim();
    if trimmed.is_empty() || trimmed.len() > 512 {
        return Err(AppError::validation(
            "Photo URL is empty or too long.",
            "ছবির লিংকটি সঠিক নয়।",
        ));
    }

    let base = public_upload_base_url.trim_end_matches('/');
    let file_part = if let Some(rest) = trimmed.strip_prefix("/uploads/") {
        rest
    } else if let Some(rest) = trimmed.strip_prefix(base).and_then(|s| s.strip_prefix('/')) {
        rest
    } else {
        return Err(AppError::validation(
            "Photo URL must reference an uploaded server asset.",
            "শুধুমাত্র এই পোর্টালে আপলোড করা ছবির লিংক গ্রহণযোগ্য।",
        ));
    };

    if file_part.contains('/') || file_part.contains('\\') || file_part.contains("..") {
        return Err(AppError::validation(
            "Invalid photo asset path.",
            "ছবির ফাইল পাথ সঠিক নয়।",
        ));
    }

    let valid_ext = file_part.ends_with(".jpg") || file_part.ends_with(".png");
    let stem = file_part.split('.').next().unwrap_or("");
    if !valid_ext || Uuid::parse_str(stem).is_err() {
        return Err(AppError::validation(
            "Photo filename must match uploaded UUID image format.",
            "আপলোড করা ছবির নামটি সঠিক ফরম্যাটে নেই।",
        ));
    }

    Ok(format!("/uploads/{file_part}"))
}

/// Escape SQL `LIKE`/`ILIKE` metacharacters (`\`, `%`, `_`) so user search input matches literally.
pub fn escape_ilike_pattern(raw: &str) -> String {
    let mut out = String::with_capacity(raw.len() + 4);
    for ch in raw.chars() {
        match ch {
            '\\' | '%' | '_' => {
                out.push('\\');
                out.push(ch);
            }
            _ => out.push(ch),
        }
    }
    out
}

/// Generate a non-sequential public tracking code (`<PREFIX>-<05d>-<6-char CSPRNG suffix>`, <= 24 chars).
pub fn generate_tracking_code(prefix: &str, seq_num: i64) -> String {
    const ALPHABET: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let mut entropy = [0u8; 6];
    OsRng.fill_bytes(&mut entropy);
    let mut suffix = String::with_capacity(6);
    for byte in entropy {
        suffix.push(ALPHABET[(byte as usize) % ALPHABET.len()] as char);
    }
    format!("{prefix}-{seq_num:05}-{suffix}")
}

/// Hash arbitrary string input with cryptographic SHA-256 (lowercase hex).
pub fn sha256_hex(input: &str) -> String {
    let digest = Sha256::digest(input.as_bytes());
    let mut hex = String::with_capacity(64);
    for b in digest {
        let _ = write!(&mut hex, "{b:02x}");
    }
    hex
}

/// Insert a persistent in-app notification for a user if `user_id` is known.
pub async fn create_notification(
    tx: &mut Transaction<'_, Postgres>,
    user_id: Option<Uuid>,
    title_bn: &str,
    body_bn: &str,
    entity_type: &str,
    entity_id: Uuid,
) -> Result<(), AppError> {
    let Some(uid) = user_id else {
        return Ok(());
    };

    sqlx::query(
        r#"
        INSERT INTO notifications (user_id, title_bn, body_bn, entity_type, entity_id)
        VALUES ($1, $2, $3, $4, $5)
        "#,
    )
    .bind(uid)
    .bind(title_bn)
    .bind(body_bn)
    .bind(entity_type)
    .bind(entity_id)
    .execute(&mut **tx)
    .await?;

    Ok(())
}

/// Insert an immutable audit trail event inside either a pool or open transaction.
#[allow(clippy::too_many_arguments)]
pub async fn record_audit_log<'e, E>(
    executor: E,
    actor_user_id: Option<Uuid>,
    actor_role: Option<&str>,
    action: &str,
    entity_type: Option<&str>,
    entity_id: Option<Uuid>,
    ip_address: Option<&str>,
    metadata: serde_json::Value,
) -> Result<(), AppError>
where
    E: sqlx::Executor<'e, Database = Postgres>,
{
    sqlx::query(
        r#"
        INSERT INTO audit_logs (
            actor_user_id, actor_role, action, entity_type, entity_id, ip_address, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#,
    )
    .bind(actor_user_id)
    .bind(actor_role)
    .bind(action)
    .bind(entity_type)
    .bind(entity_id)
    .bind(ip_address)
    .bind(metadata)
    .execute(executor)
    .await?;

    Ok(())
}

/// Check if a vehicle still has any active non-terminal pickup or dump report; if none, free it.
pub async fn release_vehicle_if_idle(
    tx: &mut Transaction<'_, Postgres>,
    vehicle_id: Option<Uuid>,
) -> Result<(), AppError> {
    let Some(vid) = vehicle_id else {
        return Ok(());
    };

    let active_pickups: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM pickup_requests WHERE assigned_vehicle_id = $1 AND status IN ('assigned', 'in_progress')",
    )
    .bind(vid)
    .fetch_one(&mut **tx)
    .await?;

    let active_reports: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM dump_reports WHERE assigned_vehicle_id = $1 AND status = 'dispatched'",
    )
    .bind(vid)
    .fetch_one(&mut **tx)
    .await?;

    if active_pickups == 0 && active_reports == 0 {
        sqlx::query(
            "UPDATE collector_vehicles SET status = 'available', updated_at = NOW() WHERE id = $1 AND status != 'offline'",
        )
        .bind(vid)
        .execute(&mut **tx)
        .await?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_valid_bd_phones_and_rejects_invalid_prefixes() {
        assert_eq!(normalize_bd_phone("01715883210").unwrap(), "01715-883210");
        assert_eq!(
            normalize_bd_phone("+8801819-653241").unwrap(),
            "01819-653241"
        );
        assert!(normalize_bd_phone("01012345678").is_err());
        assert!(normalize_bd_phone("01212345678").is_err());
        assert!(normalize_bd_phone("12345").is_err());
    }

    #[test]
    fn enforces_savar_bounds() {
        assert!(validate_coords(23.8492, 90.2546).is_ok());
        assert!(validate_coords(22.3569, 91.7832).is_err()); // Chattogram rejected
        assert!(validate_coords(f64::NAN, 90.25).is_err());
    }

    #[test]
    fn validates_uploaded_photo_urls_only() {
        let valid = "/uploads/550e8400-e29b-41d4-a716-446655440000.jpg";
        assert_eq!(
            validate_uploaded_photo_url(valid, "http://localhost:8080/uploads").unwrap(),
            valid
        );
        assert!(validate_uploaded_photo_url(
            "javascript:alert(1)",
            "http://localhost:8080/uploads"
        )
        .is_err());
        assert!(validate_uploaded_photo_url(
            "https://evil.example/a.jpg",
            "http://localhost:8080/uploads"
        )
        .is_err());
        assert!(validate_uploaded_photo_url(
            "/uploads/../etc/passwd.jpg",
            "http://localhost:8080/uploads"
        )
        .is_err());
    }

    #[test]
    fn masks_phone_safely() {
        assert_eq!(mask_phone("01715-883210"), "01715-••••10");
    }

    #[test]
    fn escapes_ilike_wildcards_and_generates_random_codes() {
        assert_eq!(escape_ilike_pattern(r"50%_off\zone"), r"50\%\_off\\zone");
        let a = generate_tracking_code("CS-PK", 42);
        let b = generate_tracking_code("CS-PK", 42);
        assert!(a.starts_with("CS-PK-00042-"));
        assert_eq!(a.len(), 18);
        assert_ne!(a, b);
    }
}
