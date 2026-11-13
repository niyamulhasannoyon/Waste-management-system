use axum::Json;
use utoipa::{
    openapi::security::{HttpAuthScheme, HttpBuilder, SecurityScheme},
    Modify, OpenApi,
};

struct SecurityAddon;

impl Modify for SecurityAddon {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        let components = openapi.components.get_or_insert_with(Default::default);
        components.add_security_scheme(
            "bearerAuth",
            SecurityScheme::Http(
                HttpBuilder::new()
                    .scheme(HttpAuthScheme::Bearer)
                    .bearer_format("OpaqueToken")
                    .build(),
            ),
        );
    }
}

#[derive(OpenApi)]
#[openapi(
    info(
        title = "Clean Savar Municipal Waste Management API",
        version = "1.0.0",
        description = "PostGIS-backed unified REST API for Savar citizens, collectors, recycling partners, and municipal dispatchers."
    ),
    modifiers(&SecurityAddon),
    paths(
        crate::routes::health::health_check,
        crate::routes::auth::otp_login,
        crate::routes::auth::verify_otp,
        crate::routes::auth::phone_login,
        crate::routes::auth::firebase_login,
        crate::routes::auth::me,
        crate::routes::auth::logout,
        crate::routes::auth::erase_account,
        crate::routes::auth::purge_retention,
        crate::routes::wards::list_wards,
        crate::routes::wards::resolve_ward,
        crate::routes::wards::public_analytics,
        crate::routes::wards::admin_analytics,
        crate::routes::pickups::list_pickups,
        crate::routes::pickups::create_pickup,
        crate::routes::pickups::track_by_code,
        crate::routes::pickups::update_pickup_status,
        crate::routes::reports::list_public_hotspots,
        crate::routes::reports::list_reports,
        crate::routes::reports::create_report,
        crate::routes::reports::track_by_code,
        crate::routes::reports::update_report_status,
        crate::routes::dispatch::list_vehicles,
        crate::routes::dispatch::nearby_workers,
        crate::routes::dispatch::update_vehicle_location,
        crate::routes::dispatch::assign_vehicle,
        crate::routes::collector::complete_task,
        crate::routes::collector::sync_batch,
        crate::routes::partner::list_lots,
        crate::routes::partner::create_lot,
        crate::routes::partner::claim_lot,
        crate::routes::partner::collect_lot,
        crate::routes::notifications::list_notifications,
        crate::routes::notifications::mark_notification_read,
        crate::routes::uploads::upload_photo
    ),
    tags(
        (name = "Health", description = "Service and PostGIS readiness probes"),
        (name = "Auth", description = "OTP authentication, session management, and PII erasure"),
        (name = "Admin", description = "Administrative analytics and retention controls"),
        (name = "Wards", description = "Savar Pourashava ward/union summaries and spatial lookup"),
        (name = "Pickups", description = "Citizen waste pickup scheduling and tracking"),
        (name = "Reports", description = "Illegal dump reporting and hotspot deduplication"),
        (name = "Dispatch", description = "Fleet telemetry and nearest-vehicle assignment"),
        (name = "Collector", description = "Idempotent field task completion and offline batch sync"),
        (name = "Partner", description = "Recyclable material lot claiming and collection"),
        (name = "Notifications", description = "Authenticated user status notifications"),
        (name = "Uploads", description = "EXIF-stripped image asset uploads")
    )
)]
pub struct ApiDoc;

/// Serve the generated OpenAPI specification at `GET /api/v1/openapi.json`.
pub async fn openapi_json() -> Json<utoipa::openapi::OpenApi> {
    Json(ApiDoc::openapi())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn openapi_spec_contains_paths_security_and_schemas() {
        let value = serde_json::to_value(ApiDoc::openapi()).expect("serialize OpenAPI JSON");
        let version = value["openapi"].as_str().unwrap_or_default();
        assert!(version.starts_with("3."));
        assert!(value["paths"]["/api/v1/health"].is_object());
        assert!(value["paths"]["/api/v1/auth/otp-login"].is_object());
        assert!(value["paths"]["/api/v1/auth/erase"].is_object());
        assert!(value["paths"]["/api/v1/pickups"].is_object());
        assert!(value["paths"]["/api/v1/reports"].is_object());
        assert!(value["paths"]["/api/v1/collector/tasks/{task_id}/complete"].is_object());
        assert!(value["components"]["securitySchemes"]["bearerAuth"].is_object());
        assert!(value["components"]["schemas"]["PickupRequestRecord"].is_object());
        assert!(value["components"]["schemas"]["DumpReportRecord"].is_object());
        assert!(value["components"]["schemas"]["ErrorBody"].is_object());
    }
}
