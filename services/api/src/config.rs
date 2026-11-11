use std::env;

/// Runtime configuration loaded from environment variables.
#[derive(Clone, Debug)]
pub struct AppConfig {
    pub database_url: String,
    pub bind_addr: String,
    pub cors_allowed_origins: Vec<String>,
    pub otp_dev_mode: bool,
    pub otp_ttl_seconds: i64,
    pub session_ttl_seconds: i64,
    pub require_auth: bool,
    pub duplicate_radius_meters: f64,
    pub nearby_default_radius_meters: f64,
}

impl AppConfig {
    pub fn from_env() -> Self {
        let database_url = env::var("DATABASE_URL").unwrap_or_else(|_| {
            "postgres://clean_savar:clean_savar_dev_password@localhost:5432/clean_savar".to_string()
        });
        let bind_addr = env::var("API_BIND_ADDR").unwrap_or_else(|_| "0.0.0.0:8080".to_string());
        let cors_allowed_origins = env::var("CORS_ALLOWED_ORIGINS")
            .unwrap_or_else(|_| "http://localhost:3000,http://127.0.0.1:3000".to_string())
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();

        let otp_dev_mode = parse_bool_env("OTP_DEV_MODE", true);
        let require_auth = parse_bool_env("REQUIRE_AUTH", false);
        let otp_ttl_seconds = parse_i64_env("OTP_TTL_SECONDS", 300).clamp(60, 1800);
        let session_ttl_seconds = parse_i64_env("SESSION_TTL_SECONDS", 2_592_000).clamp(300, 31_536_000);
        let duplicate_radius_meters =
            parse_f64_env("COMPLAINT_DUPLICATE_RADIUS_METERS", 50.0).clamp(10.0, 500.0);
        let nearby_default_radius_meters =
            parse_f64_env("WORKERS_NEARBY_DEFAULT_RADIUS_METERS", 5000.0).clamp(100.0, 50_000.0);

        Self {
            database_url,
            bind_addr,
            cors_allowed_origins,
            otp_dev_mode,
            otp_ttl_seconds,
            session_ttl_seconds,
            require_auth,
            duplicate_radius_meters,
            nearby_default_radius_meters,
        }
    }
}

fn parse_bool_env(key: &str, default: bool) -> bool {
    match env::var(key) {
        Ok(val) => matches!(val.trim().to_ascii_lowercase().as_str(), "1" | "true" | "yes" | "on"),
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
