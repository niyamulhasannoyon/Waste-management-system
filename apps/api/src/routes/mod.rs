pub mod dispatch;
pub mod health;
pub mod partner;
pub mod pickups;
pub mod reports;
pub mod uploads;
pub mod wards;

use axum::{
    routing::{get, patch, post},
    Router,
};

use crate::db::AppState;

pub fn api_router() -> Router<AppState> {
    Router::new()
        .route("/health", get(health::health_check))
        .route("/wards", get(wards::list_wards))
        .route("/wards/resolve", get(wards::resolve_ward))
        .route("/pickups", get(pickups::list_pickups).post(pickups::create_pickup))
        .route("/pickups/track/:code", get(pickups::track_by_code))
        .route("/pickups/:id/status", patch(pickups::update_pickup_status))
        .route("/reports", get(reports::list_reports).post(reports::create_report))
        .route("/reports/track/:code", get(reports::track_by_code))
        .route("/reports/:id/status", patch(reports::update_report_status))
        .route("/dispatch/vehicles", get(dispatch::list_vehicles))
        .route("/dispatch/vehicles/:id/location", patch(dispatch::update_vehicle_location))
        .route("/dispatch/assign", post(dispatch::assign_vehicle))
        .route("/partner/lots", get(partner::list_lots))
        .route("/partner/lots/:id/claim", post(partner::claim_lot))
        .route("/uploads/photo", post(uploads::upload_photo))
}
