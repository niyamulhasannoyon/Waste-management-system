pub mod auth;
pub mod collector;
pub mod complaints;
pub mod health;
pub mod pickups;
pub mod workers;
pub mod zones;

use axum::{
    routing::{get, patch, post},
    Router,
};

use crate::db::AppState;

pub fn api_router() -> Router<AppState> {
    Router::new()
        .route("/health", get(health::health_check))
        .route("/auth/otp-login", post(auth::otp_login))
        .route("/auth/verify", post(auth::verify_otp))
        .route("/zones", get(zones::list_zones))
        .route("/zones/resolve", get(zones::resolve_zone))
        .route("/pickups", get(pickups::list_pickups).post(pickups::create_pickup))
        .route("/complaints", get(complaints::list_complaints).post(complaints::create_complaint))
        .route("/workers/nearby", get(workers::nearby_workers))
        .route("/workers/:id/location", patch(workers::update_worker_location))
        .route("/collector/tasks/:id/complete", patch(collector::complete_task))
}
