use std::env;

/// Runtime configuration loaded from environment variables.
#[derive(Clone, Debug)]
pub struct AppConfig {
    pub database_url: String,
    pub bind_addr: String,
    pub upload_dir: String,
    pub public_upload_base_url: String,
    pub max_upload_bytes: usize,
    pub cors_allowed_origins: Vec<String>,
}

impl AppConfig {
    /// Load configuration with sensible local-development defaults.
    pub fn from_env() -> Result<Self, String> {
        let database_url = env::var("DATABASE_URL").unwrap_or_else(|_| {
            "postgres://clean_savar:clean_savar_dev_password@localhost:5432/clean_savar".to_string()
        });
        let bind_addr = env::var("API_BIND_ADDR").unwrap_or_else(|_| "0.0.0.0:8080".to_string());
        let upload_dir = env::var("UPLOAD_DIR").unwrap_or_else(|_| "./uploads".to_string());
        let public_upload_base_url = env::var("PUBLIC_UPLOAD_BASE_URL")
            .unwrap_or_else(|_| "http://localhost:8080/uploads".to_string());
        let max_upload_bytes = env::var("MAX_UPLOAD_BYTES")
            .ok()
            .and_then(|v| v.parse::<usize>().ok())
            .unwrap_or(5 * 1024 * 1024);

        let cors_allowed_origins = env::var("CORS_ALLOWED_ORIGINS")
            .unwrap_or_else(|_| "http://localhost:3000,http://127.0.0.1:3000".to_string())
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
        })
    }
}
