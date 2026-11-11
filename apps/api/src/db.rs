use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;

use crate::error::AppError;

/// Shared application state injected into Axum handlers.
#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub upload_dir: String,
    pub public_upload_base_url: String,
    pub max_upload_bytes: usize,
}

/// Create the PostgreSQL connection pool and verify PostGIS availability.
pub async fn init_pool(database_url: &str) -> Result<PgPool, sqlx::Error> {
    let pool = PgPoolOptions::new()
        .max_connections(15)
        .connect(database_url)
        .await?;

    sqlx::migrate!("./migrations").run(&pool).await?;
    Ok(pool)
}

/// Resolve a GPS coordinate (`lat`, `lng`) to a Savar ward ID via PostGIS `ST_Contains`,
/// falling back to the nearest ward centroid if the point lies slightly outside polygons.
pub async fn resolve_ward_id_by_coords(
    pool: &PgPool,
    lat: f64,
    lng: f64,
) -> Result<i16, AppError> {
    let contained: Option<i16> = sqlx::query_scalar(
        r#"
        SELECT id
        FROM wards
        WHERE is_active = TRUE
          AND ST_Contains(boundary, ST_SetSRID(ST_MakePoint($1, $2), 4326))
        LIMIT 1
        "#,
    )
    .bind(lng)
    .bind(lat)
    .fetch_optional(pool)
    .await?;

    if let Some(ward_id) = contained {
        return Ok(ward_id);
    }

    let nearest: Option<i16> = sqlx::query_scalar(
        r#"
        SELECT id
        FROM wards
        WHERE is_active = TRUE
        ORDER BY centroid <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)
        LIMIT 1
        "#,
    )
    .bind(lng)
    .bind(lat)
    .fetch_optional(pool)
    .await?;

    nearest.ok_or_else(|| {
        AppError::not_found(
            "No active Savar ward configured.",
            "সাভারের কোনো সক্রিয় ওয়ার্ড পাওয়া যায়নি।",
        )
    })
}

/// Validate and normalize Bangladeshi mobile numbers (accepts 01XXXXXXXXX or +8801XXXXXXXXX).
pub fn normalize_bd_phone(raw: &str) -> Result<String, AppError> {
    let digits: String = raw.chars().filter(|c| c.is_ascii_digit()).collect();
    let normalized = if digits.starts_with("8801") && digits.len() == 13 {
        format!("0{}", &digits[3..])
    } else if digits.starts_with("01") && digits.len() == 11 {
        digits
    } else {
        return Err(AppError::validation(
            "Phone number must be a valid 11-digit Bangladeshi mobile number starting with 01.",
            "সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন (যেমন: 01711000000)।",
        ));
    };

    Ok(format!("{}-{}", &normalized[..5], &normalized[5..]))
}

/// Validate Savar / Bangladesh GPS bounds to reject clearly corrupted coordinates.
pub fn validate_coords(lat: f64, lng: f64) -> Result<(), AppError> {
    if !lat.is_finite() || !lng.is_finite() || !(20.5..=26.7).contains(&lat) || !(88.0..=92.7).contains(&lng) {
        return Err(AppError::validation(
            "GPS coordinates are outside Bangladesh service bounds.",
            "লোকেশন কোঅর্ডিনেট সঠিক নয়। অনুগ্রহ করে সাভারের মধ্যে সঠিক পিন দিন।",
        ));
    }
    Ok(())
}
