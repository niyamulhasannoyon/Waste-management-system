use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{types::Json, FromRow};
use uuid::Uuid;

#[derive(Debug, Serialize, FromRow)]
pub struct DumpReportRecord {
    pub id: Uuid,
    pub tracking_code: String,
    pub reporter_name: String,
    pub reporter_phone: String,
    pub ward_id: i16,
    pub ward_name_bn: String,
    pub title_bn: String,
    pub description_bn: String,
    pub landmark: String,
    pub severity: String,
    pub status: String,
    pub lat: f64,
    pub lng: f64,
    pub photo_urls: Json<Vec<String>>,
    pub resolved_photo_url: Option<String>,
    pub assigned_vehicle_id: Option<Uuid>,
    pub assigned_vehicle_code: Option<String>,
    pub cleared_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateDumpReportRequest {
    #[serde(default)]
    pub reporter_name: String,
    pub reporter_phone: String,
    pub ward_id: Option<i16>,
    pub title_bn: String,
    #[serde(default)]
    pub description_bn: String,
    pub landmark: String,
    #[serde(default = "default_severity")]
    pub severity: String,
    pub lat: f64,
    pub lng: f64,
    #[serde(default)]
    pub photo_urls: Vec<String>,
}

fn default_severity() -> String {
    "high".to_string()
}

#[derive(Debug, Deserialize)]
pub struct ListReportsQuery {
    pub ward_id: Option<i16>,
    pub status: Option<String>,
    pub lat: Option<f64>,
    pub lng: Option<f64>,
    pub radius_m: Option<f64>,
    pub limit: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateReportStatusRequest {
    pub status: String,
    pub resolved_photo_url: Option<String>,
    #[serde(default)]
    pub note_bn: String,
    #[serde(default = "default_report_actor")]
    pub actor_label: String,
}

fn default_report_actor() -> String {
    "মাঠপর্যায় সংগ্রহকারী".to_string()
}

#[derive(Debug, Serialize, FromRow)]
pub struct CollectorVehicleRecord {
    pub id: Uuid,
    pub code: String,
    pub vehicle_type: String,
    pub driver_name_bn: String,
    pub driver_phone: String,
    pub ward_id: i16,
    pub ward_name_bn: String,
    pub lat: f64,
    pub lng: f64,
    pub status: String,
    pub distance_meters: Option<f64>,
    pub last_ping_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct DispatchAssignRequest {
    pub entity_type: String,
    pub entity_id: Uuid,
    pub vehicle_id: Option<Uuid>,
    #[serde(default)]
    pub note_bn: String,
}

#[derive(Debug, Serialize)]
pub struct DispatchAssignResponse {
    pub entity_type: String,
    pub entity_id: Uuid,
    pub assigned_vehicle_id: Uuid,
    pub assigned_vehicle_code: String,
    pub new_status: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateVehicleLocationRequest {
    pub lat: f64,
    pub lng: f64,
    pub status: Option<String>,
}
