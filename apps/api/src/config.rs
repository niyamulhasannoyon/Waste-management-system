use std::{env, net::IpAddr};

/// Runtime configuration loaded from environment variables.
/// Fails closed if required secrets/database config are missing outside explicit dev mode.
#[derive(Clone, Debug)]
pub struct AppConfig {
    #[allow(dead_code)]
    pub app_env: String,
    pub database_url: String,
    pub bind_addr: String,
    pub upload_dir: String,
    pub public_upload_base_url: String,
    pub max_upload_bytes: usize,
    pub cors_allowed_origins: Vec<String>,
    pub trusted_proxy_ips: Vec<IpAddr>,
    pub auth_secret: String,
    pub otp_dev_mode: bool,
    pub otp_ttl_seconds: i64,
    pub session_ttl_seconds: i64,
    pub duplicate_radius_meters: f64,
    pub nearby_default_radius_meters: f64,
    pub admin_bootstrap_phones: Vec<String>,
    pub firebase_project_id: String,
}

impl AppConfig {
    /// Load configuration safely using a custom secret/environment variable lookup closure.
    pub fn from_lookup<F>(mut lookup: F) -> Result<Self, String>
    where
        F: FnMut(&str) -> Option<String>,
    {
        let app_env = lookup("APP_ENV")
            .unwrap_or_else(|| "development".to_string())
            .trim()
            .to_ascii_lowercase();
        let is_production = matches!(app_env.as_str(), "production" | "prod");
        let allow_dev_defaults = parse_bool_val(lookup("ALLOW_INSECURE_DEV_DEFAULTS"), false);
        let otp_dev_mode = parse_bool_val(lookup("OTP_DEV_MODE"), false);

        if is_production && allow_dev_defaults {
            return Err(
                "ALLOW_INSECURE_DEV_DEFAULTS cannot be enabled when APP_ENV=production".to_string(),
            );
        }
        if is_production && otp_dev_mode {
            return Err("OTP_DEV_MODE cannot be enabled when APP_ENV=production".to_string());
        }

        let database_url = match lookup("DATABASE_URL") {
            Some(val) if !val.trim().is_empty() => val,
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

        let auth_secret = match lookup("AUTH_SECRET") {
            Some(val) if val.trim().len() >= 32 && !val.contains("replace_with_") => {
                val.trim().to_string()
            }
            Some(_) if !allow_dev_defaults => {
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
                return Err("AUTH_SECRET (minimum 32 characters) must be configured".to_string());
            }
        };

        let firebase_project_id = lookup("FIREBASE_PROJECT_ID")
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| "clean-savar".to_string());

        let bind_addr = lookup("API_BIND_ADDR")
            .or_else(|| lookup("PORT").map(|p| format!("0.0.0.0:{p}")))
            .unwrap_or_else(|| "0.0.0.0:8080".to_string());
        let upload_dir = lookup("UPLOAD_DIR").unwrap_or_else(|| "./uploads".to_string());
        let public_upload_base_url = lookup("PUBLIC_UPLOAD_BASE_URL")
            .unwrap_or_else(|| "http://localhost:8000/uploads".to_string());
        let max_upload_bytes = lookup("MAX_UPLOAD_BYTES")
            .and_then(|v| v.trim().parse::<usize>().ok())
            .unwrap_or(5 * 1024 * 1024)
            .clamp(64 * 1024, 15 * 1024 * 1024);

        let cors_allowed_origins: Vec<String> = lookup("CORS_ALLOWED_ORIGINS")
            .unwrap_or_else(|| "https://clean-savar.web.app,http://localhost:3000,http://127.0.0.1:3000".to_string())
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();

        if cors_allowed_origins.iter().any(|origin| origin == "*") {
            return Err("CORS_ALLOWED_ORIGINS cannot contain wildcard '*'".to_string());
        }

        let trusted_proxy_ips: Vec<IpAddr> = lookup("TRUSTED_PROXY_IPS")
            .unwrap_or_default()
            .split(',')
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(|s| {
                s.parse::<IpAddr>()
                    .map_err(|_| format!("Invalid IP address in TRUSTED_PROXY_IPS: {s}"))
            })
            .collect::<Result<Vec<_>, _>>()?;

        let otp_ttl_seconds = parse_i64_val(lookup("OTP_TTL_SECONDS"), 300).clamp(60, 1800);
        let session_ttl_seconds =
            parse_i64_val(lookup("SESSION_TTL_SECONDS"), 604_800).clamp(300, 31_536_000);
        let duplicate_radius_meters =
            parse_f64_val(lookup("COMPLAINT_DUPLICATE_RADIUS_METERS"), 50.0).clamp(10.0, 500.0);
        let nearby_default_radius_meters =
            parse_f64_val(lookup("WORKERS_NEARBY_DEFAULT_RADIUS_METERS"), 5000.0).clamp(100.0, 50_000.0);

        let admin_bootstrap_phones = lookup("ADMIN_BOOTSTRAP_PHONES")
            .unwrap_or_default()
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();

        Ok(Self {
            app_env,
            database_url,
            bind_addr,
            upload_dir,
            public_upload_base_url,
            max_upload_bytes,
            cors_allowed_origins,
            trusted_proxy_ips,
            auth_secret,
            otp_dev_mode,
            otp_ttl_seconds,
            session_ttl_seconds,
            duplicate_radius_meters,
            nearby_default_radius_meters,
            admin_bootstrap_phones,
            firebase_project_id,
        })
    }

    /// Load configuration safely from ambient environment variables.
    pub fn from_env() -> Result<Self, String> {
        Self::from_lookup(|k| env::var(k).ok())
    }

    /// Load configuration preferentially from Shuttle's SecretStore, falling back to environment variables.
    pub fn from_secrets_and_env(secrets: &shuttle_runtime::SecretStore) -> Result<Self, String> {
        Self::from_lookup(|k| secrets.get(k).or_else(|| env::var(k).ok()))
    }
}

fn parse_bool_val(val: Option<String>, default: bool) -> bool {
    match val {
        Some(s) => matches!(
            s.trim().to_ascii_lowercase().as_str(),
            "1" | "true" | "yes" | "on"
        ),
        None => default,
    }
}

fn parse_i64_val(val: Option<String>, default: i64) -> i64 {
    val.and_then(|v| v.trim().parse::<i64>().ok()).unwrap_or(default)
}

fn parse_f64_val(val: Option<String>, default: f64) -> f64 {
    val.and_then(|v| v.trim().parse::<f64>().ok())
        .filter(|v| v.is_finite())
        .unwrap_or(default)
}
