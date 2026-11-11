use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, FromRow)]
pub struct WardSummary {
    pub id: i16,
    pub code: String,
    pub name_bn: String,
    pub name_en: String,
    pub zone_label_bn: String,
    pub supervisor_name: String,
    pub supervisor_phone: String,
    pub centroid_lat: f64,
    pub centroid_lng: f64,
    pub pending_pickups: i64,
    pub open_reports: i64,
    pub active_vehicles: i64,
}

#[derive(Debug, Deserialize)]
pub struct ResolveWardQuery {
    pub lat: f64,
    pub lng: f64,
}

#[derive(Debug, Serialize)]
pub struct ResolvedWardResponse {
    pub ward_id: i16,
    pub code: String,
    pub name_bn: String,
    pub zone_label_bn: String,
    pub exact_match: bool,
}
