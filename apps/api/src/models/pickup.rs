use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, FromRow)]
pub struct PickupRequestRecord {
    pub id: Uuid,
    pub tracking_code: String,
    pub citizen_name: String,
    pub citizen_phone: String,
    pub ward_id: i16,
    pub ward_name_bn: String,
    pub address_line: String,
    pub landmark: String,
    pub waste_type: String,
    pub slot: String,
    pub estimated_bags: i16,
    pub status: String,
    pub lat: f64,
    pub lng: f64,
    pub assigned_vehicle_id: Option<Uuid>,
    pub assigned_vehicle_code: Option<String>,
    pub notes: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreatePickupRequest {
    pub citizen_name: String,
    pub citizen_phone: String,
    pub ward_id: Option<i16>,
    pub address_line: String,
    #[serde(default)]
    pub landmark: String,
    pub waste_type: String,
    pub slot: String,
    #[serde(default = "default_bags")]
    pub estimated_bags: i16,
    pub lat: Option<f64>,
    pub lng: Option<f64>,
    #[serde(default)]
    pub notes: String,
}

fn default_bags() -> i16 {
    2
}

#[derive(Debug, Deserialize)]
pub struct ListPickupsQuery {
    pub ward_id: Option<i16>,
    pub status: Option<String>,
    pub phone: Option<String>,
    pub limit: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePickupStatusRequest {
    pub status: String,
    #[serde(default)]
    pub note_bn: String,
    #[serde(default = "default_actor")]
    pub actor_label: String,
}

fn default_actor() -> String {
    "সাভার পৌরসভা অপস".to_string()
}
