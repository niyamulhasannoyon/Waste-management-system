use std::env;

/// Runtime configuration loaded from environment variables.
/// Fails closed if required secrets/database config are missing outside explicit dev mode.
#[derive(Clone, Debug)]
pub struct AppConfig {
    pub database_url: String,
    pub bind_addr: String,
    pub upload_dir: String,
    pub public_upload_base_url: String,
    pub max_upload_bytes: usize,
    pub cors_allowed_origins: Vec<String>,
    pub auth_secret: String,
    pub otp_dev_mode: bool,
    pub otp_ttl_seconds: i64,
    pub session_ttl_seconds: i64,
    pub duplicate_radius_meters: f64,
    pub nearby_default_radius_meters: f64,
    pub admin_bootstrap_phones: Vec<String>,
}

impl AppConfig {
    /// Load configuration safely from environment variables.
    pub fn from_env() -> Result<Self, String> {
        let allow_dev_defaults = parse_bool_env("ALLOW_INSECURE_DEV_DEFAULTS", false);

        let database_url = match env::var("DATABASE_URL") {
            Ok(val) if !val.trim().is_empty() => val,
            _ if allow_dev_defaults => {
                tracing::warn!(
                    "ALLOW_INSECURE_DEV_DEFAULTS=true: falling back to local development DATABASE_URL"
                );
                "postgres://clean_savar:clean_savar_local_only_pw@localhost:5432/clean_savar"
                    .to_string()
            }
            _ => {
                return Err(
                    "DATABASE_URL must be set (or set ALLOW_INSECURE_DEV_DEFAULTS=true for local development)"
                        .to_string(),
                );
            }
        };

        let auth_secret = match env::var("AUTH_SECRET") {
            Ok(val) if val.trim().len() >= 32 && !val.contains("replace_with_") => {
                val.trim().to_string()
            }
            Ok(_) if !allow_dev_defaults => {
                return Err(
                    "AUTH_SECRET must be at least 32 characters and not a placeholder value"
                        .to_string(),
                );
            }
            _ if allow_dev_defaults => {
                tracing::warn!(
                    "ALLOW_INSECURE_DEV_DEFAULTS=true: using ephemeral local development AUTH_SECRET"
                );
                "clean-savar-local-dev-only-secret-do-not-use-in-prod-2026".to_string()
            }
            _ => {
                return Err(
                    "AUTH_SECRET (minimum 32 characters) must be configured".to_string(),
                );
            }
        };

        let bind_addr = env::var("API_BIND_ADDR").unwrap_or_else(|_| "0.0.0.0:8080".to_string());
        let upload_dir = env::var("UPLOAD_DIR").unwrap_or_else(|_| "./uploads".to_string());
        let public_upload_base_url = env::var("PUBLIC_UPLOAD_BASE_URL")
            .unwrap_or_else(|_| "http://localhost:8080/uploads".to_string());
        let max_upload_bytes = env::var("MAX_UPLOAD_BYTES")
            .ok()
            .and_then(|v| v.parse::<usize>().ok())
            .unwrap_or(5 * 1024 * 1024)
            .clamp(64 * 1024, 15 * 1024 * 1024);

        let cors_allowed_origins = env::var("CORS_ALLOWED_ORIGINS")
            .unwrap_or_else(|_| "http://localhost:3000,http://127.0.0.1:3000".to_string())
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();

        let otp_dev_mode = parse_bool_env("OTP_DEV_MODE", false);
        let otp_ttl_seconds = parse_i64_env("OTP_TTL_SECONDS", 300).clamp(60, 1800);
        let session_ttl_seconds =
            parse_i64_env("SESSION_TTL_SECONDS", 604_800).clamp(300, 31_536_000);
        let duplicate_radius_meters =
            parse_f64_env("COMPLAINT_DUPLICATE_RADIUS_METERS", 50.0).clamp(10.0, 500.0);
        let nearby_default_radius_meters =
            parse_f64_env("WORKERS_NEARBY_DEFAULT_RADIUS_METERS", 5000.0).clamp(100.0, 50_000.0);

        let admin_bootstrap_phones = env::var("ADMIN_BOOTSTRAP_PHONES")
            .unwrap_or_default()
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();

        Ok(Self {
            database_url,
            bind_addr,
            upload_dir,
            public_upload_base_url,
            max_upload_bytes,
            cors_allowed_origins,
            auth_secret,
            otp_dev_mode,
            otp_ttl_seconds,
            session_ttl_seconds,
            duplicate_radius_meters,
            nearby_default_radius_meters,
            admin_bootstrap_phones,
        })
    }
}

fn parse_bool_env(key: &str, default: bool) -> bool {
    match env::var(key) {
        Ok(val) => matches!(
            val.trim().to_ascii_lowercase().as_str(),
            "1" | "true" | "yes" | "on"
        ),
        Err(_) => default,
    }
}

fn parse_i64_env(key: &str, default: i64) -> i64 {
    env::var(key)
        .ok()
        .and_then(|v| v.trim().parse::<i64>().ok())
        .unwrap_or(default)
}

fn parse_f64_env(key: &str, default: f64) -> f64 {
    env::var(key)
        .ok()
        .and_then(|v| v.trim().parse::<f64>().ok())
        .filter(|v| v.is_finite())
        .unwrap_or(default)
}
