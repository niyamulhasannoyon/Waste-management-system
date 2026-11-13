pub mod auth;
pub mod collector;
pub mod dispatch;
pub mod health;
pub mod notifications;
pub mod partner;
pub mod pickups;
pub mod reports;
pub mod uploads;
pub mod wards;

use axum::{
    routing::{get, patch, post},
    Router,
};

use crate::{db::AppState, openapi};

pub fn api_router() -> Router<AppState> {
    Router::new()
        .route("/health", get(health::health_check))
        .route("/openapi.json", get(openapi::openapi_json))
        .route("/auth/otp-login", post(auth::otp_login))
        .route("/auth/otp-verify", post(auth::verify_otp))
        .route("/auth/phone-login", post(auth::phone_login))
        .route("/auth/firebase-login", post(auth::firebase_login))
        .route("/auth/me", get(auth::me))
        .route("/auth/logout", post(auth::logout))
        .route("/auth/erase", post(auth::erase_account))
        .route("/admin/retention/purge", post(auth::purge_retention))
        .route("/wards", get(wards::list_wards))
        .route("/wards/resolve", get(wards::resolve_ward))
        .route("/analytics/public", get(wards::public_analytics))
        .route("/analytics/summary", get(wards::admin_analytics))
        .route(
            "/pickups",
            get(pickups::list_pickups).post(pickups::create_pickup),
        )
        .route("/pickups/track/:code", get(pickups::track_by_code))
        .route("/pickups/:id/status", patch(pickups::update_pickup_status))
        .route("/reports/public", get(reports::list_public_hotspots))
        .route(
            "/reports",
            get(reports::list_reports).post(reports::create_report),
        )
        .route("/reports/track/:code", get(reports::track_by_code))
        .route("/reports/:id/status", patch(reports::update_report_status))
        .route("/dispatch/vehicles", get(dispatch::list_vehicles))
        .route(
            "/dispatch/vehicles/:id/location",
            patch(dispatch::update_vehicle_location),
        )
        .route("/dispatch/assign", post(dispatch::assign_vehicle))
        .route("/workers/nearby", get(dispatch::nearby_workers))
        .route(
            "/collector/tasks/:id/complete",
            patch(collector::complete_task).post(collector::complete_task),
        )
        .route("/collector/sync", post(collector::sync_batch))
        .route(
            "/partner/lots",
            get(partner::list_lots).post(partner::create_lot),
        )
        .route("/partner/lots/:id/claim", post(partner::claim_lot))
        .route("/partner/lots/:id/collect", post(partner::collect_lot))
        .route("/notifications", get(notifications::list_notifications))
        .route(
            "/notifications/:id/read",
            patch(notifications::mark_notification_read),
        )
        .route("/uploads/photo", post(uploads::upload_photo))
}
