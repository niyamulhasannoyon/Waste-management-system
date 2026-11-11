use serde::{Deserialize, Serialize};
use sqlx::{types::Json, FromRow};

#[derive(Debug, Serialize, FromRow)]
pub struct WardSummary {
    pub id: i16,
    pub code: String,
    pub zone_type: String,
    pub ward_number: Option<i16>,
    pub name_bn: String,
    pub name_en: String,
    pub zone_label_bn: String,
    pub neighborhoods: Json<Vec<String>>,
    pub schedule_bn: String,
    pub frequency_bn: String,
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
    pub zone_type: String,
    pub name_bn: String,
    pub name_en: String,
    pub zone_label_bn: String,
    pub exact_match: bool,
}

#[derive(Debug, Serialize)]
pub struct AnalyticsSummary {
    pub total_pickups: i64,
    pub pending_pickups: i64,
    pub completed_pickups: i64,
    pub total_reports: i64,
    pub open_reports: i64,
    pub cleared_reports: i64,
    pub resolution_rate_percent: f64,
    pub collected_weight_today_kg: f64,
    pub active_vehicles: i64,
    pub recyclable_open_kg: f64,
}
