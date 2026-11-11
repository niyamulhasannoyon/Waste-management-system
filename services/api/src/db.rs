use std::time::Duration;

use sqlx::{postgres::PgPoolOptions, PgPool};
use uuid::Uuid;

use crate::{config::AppConfig, error::AppError};

/// Shared application state injected into Axum route handlers.
#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub config: AppConfig,
}

/// Initialize the PostgreSQL pool and execute embedded SQLx migrations.
pub async fn init_pool(database_url: &str) -> Result<PgPool, sqlx::Error> {
    let pool = PgPoolOptions::new()
        .max_connections(15)
        .min_connections(1)
        .acquire_timeout(Duration::from_secs(5))
        .connect(database_url)
        .await?;

    sqlx::migrate!("./migrations").run(&pool).await?;
    Ok(pool)
}

/// Normalize Bangladeshi mobile numbers (`+8801XXXXXXXXX`, `8801XXXXXXXXX`, or `01XXXXXXXXX`)
/// strictly to E.164 `+8801XXXXXXXXX`.
pub fn normalize_bd_phone(raw: &str) -> Result<String, AppError> {
    let digits: String = raw.chars().filter(|c| c.is_ascii_digit()).collect();
    let national = if digits.starts_with("8801") && digits.len() == 13 {
        &digits[2..]
    } else if digits.starts_with("01") && digits.len() == 11 {
        digits.as_str()
    } else {
        return Err(AppError::validation(
            "INVALID_BD_PHONE",
            "Phone number must be a valid Bangladeshi mobile number (+8801XXXXXXXXX or 01XXXXXXXXX).",
        ));
    };

    let operator_digit = national.as_bytes()[2];
    if !matches!(operator_digit, b'3'..=b'9') {
        return Err(AppError::validation(
            "INVALID_BD_OPERATOR",
            "Bangladeshi mobile operator prefix must start with 013–019.",
        ));
    }

    Ok(format!("+88{national}"))
}

/// Validate GPS coordinates fall within Bangladesh bounds.
pub fn validate_coords(lat: f64, lng: f64) -> Result<(), AppError> {
    if !lat.is_finite()
        || !lng.is_finite()
        || !(20.5..=26.7).contains(&lat)
        || !(88.0..=92.7).contains(&lng)
    {
        return Err(AppError::validation(
            "INVALID_COORDINATES",
            "Coordinates must be valid GPS values within Savar / Bangladesh bounds.",
        ));
    }
    Ok(())
}

/// Resolve a `(ward_id, lat, lng)` tuple using PostGIS `ST_Covers` on `service_zones.boundary`,
/// falling back to nearest zone centroid or explicit ward centroid when GPS is omitted.
pub async fn resolve_zone_and_coords(
    pool: &PgPool,
    explicit_ward_id: Option<i32>,
    lat: Option<f64>,
    lng: Option<f64>,
) -> Result<(i32, f64, f64), AppError> {
    match (explicit_ward_id, lat, lng) {
        (Some(wid), Some(lat), Some(lng)) => {
            validate_coords(lat, lng)?;
            ensure_zone_exists(pool, wid).await?;
            Ok((wid, lat, lng))
        }
        (None, Some(lat), Some(lng)) => {
            validate_coords(lat, lng)?;
            let wid = resolve_zone_id_by_coords(pool, lat, lng).await?;
            Ok((wid, lat, lng))
        }
        (Some(wid), None, None) => {
            #[derive(sqlx::FromRow)]
            struct ZoneCentroid {
                lat: f64,
                lng: f64,
            }
            let c = sqlx::query_as::<_, ZoneCentroid>(
                r#"
                SELECT
                    ST_Y(centroid::geometry) AS lat,
                    ST_X(centroid::geometry) AS lng
                FROM service_zones
                WHERE id = $1 AND is_active = TRUE
                "#,
            )
            .bind(wid)
            .fetch_optional(pool)
            .await?
            .ok_or_else(|| {
                AppError::validation("INVALID_WARD_ID", "Selected Savar service zone does not exist.")
            })?;
            Ok((wid, c.lat, c.lng))
        }
        _ => Err(AppError::validation(
            "MISSING_LOCATION",
            "Provide either a valid ward_id or both lat and lng coordinates.",
        )),
    }
}

pub async fn ensure_zone_exists(pool: &PgPool, ward_id: i32) -> Result<(), AppError> {
    let exists: Option<i32> = sqlx::query_scalar(
        "SELECT id FROM service_zones WHERE id = $1 AND is_active = TRUE",
    )
    .bind(ward_id)
    .fetch_optional(pool)
    .await?;

    if exists.is_none() {
        return Err(AppError::validation(
            "INVALID_WARD_ID",
            "Selected Savar service zone does not exist or is inactive.",
        ));
    }
    Ok(())
}

/// Find the Savar municipality ward or union polygon containing `(lat, lng)` via `ST_Covers`.
/// Falls back to nearest zone centroid if the coordinate lies slightly outside seeded polygons.
pub async fn resolve_zone_id_by_coords(
    pool: &PgPool,
    lat: f64,
    lng: f64,
) -> Result<i32, AppError> {
    let covered: Option<i32> = sqlx::query_scalar(
        r#"
        SELECT id
        FROM service_zones
        WHERE is_active = TRUE
          AND ST_Covers(boundary, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography)
        ORDER BY CASE WHEN zone_type = 'municipality_ward' THEN 0 ELSE 1 END ASC, id ASC
        LIMIT 1
        "#,
    )
    .bind(lng)
    .bind(lat)
    .fetch_optional(pool)
    .await?;

    if let Some(id) = covered {
        return Ok(id);
    }

    let nearest: Option<i32> = sqlx::query_scalar(
        r#"
        SELECT id
        FROM service_zones
        WHERE is_active = TRUE
        ORDER BY centroid <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        LIMIT 1
        "#,
    )
    .bind(lng)
    .bind(lat)
    .fetch_optional(pool)
    .await?;

    nearest.ok_or_else(|| {
        AppError::not_found(
            "NO_SERVICE_ZONES",
            "No active Savar service zones are configured.",
        )
    })
}

/// Generate a collision-resistant human-readable tracking code (e.g. `CS-PK-A4F91B2C`).
pub fn generate_tracking_code(prefix: &str, id: Uuid) -> String {
    let low32 = (id.as_u128() & 0xFFFF_FFFF) as u32;
    format!("{prefix}-{low32:08X}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_valid_bd_phones() {
        assert_eq!(normalize_bd_phone("+8801711223344").unwrap(), "+8801711223344");
        assert_eq!(normalize_bd_phone("8801812-345678").unwrap(), "+8801812345678");
        assert_eq!(normalize_bd_phone("01911 552104").unwrap(), "+8801911552104");
        assert_eq!(normalize_bd_phone("01300112233").unwrap(), "+8801300112233");
    }

    #[test]
    fn rejects_invalid_bd_phones() {
        assert!(normalize_bd_phone("+8801211223344").is_err());
        assert!(normalize_bd_phone("0171122").is_err());
        assert!(normalize_bd_phone("+14155552671").is_err());
    }

    #[test]
    fn validates_savar_and_rejects_out_of_bounds_coords() {
        assert!(validate_coords(23.8562, 90.2561).is_ok());
        assert!(validate_coords(0.0, 0.0).is_err());
        assert!(validate_coords(f64::NAN, 90.25).is_err());
    }
}
