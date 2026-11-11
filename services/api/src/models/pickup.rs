use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Type};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[sqlx(type_name = "pickup_status", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum PickupStatus {
    Pending,
    Assigned,
    InProgress,
    Completed,
    Cancelled,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[sqlx(type_name = "waste_category", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum WasteCategory {
    Household,
    Organic,
    Recyclable,
    Hazardous,
    Bulky,
}

#[derive(Debug, Serialize, FromRow)]
pub struct PickupRequestRecord {
    pub id: Uuid,
    pub tracking_code: String,
    pub user_id: Option<Uuid>,
    pub ward_id: i32,
    pub ward_code: String,
    pub ward_name_en: String,
    pub ward_name_bn: String,
    pub assigned_worker_id: Option<Uuid>,
    pub citizen_phone: String,
    pub address: String,
    pub waste_category: WasteCategory,
    pub scheduled_time: DateTime<Utc>,
    pub weight_kg: Option<f64>,
    pub status: PickupStatus,
    pub lat: f64,
    pub lng: f64,
    pub notes: String,
    pub completion_photo_url: Option<String>,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreatePickupRequest {
    pub citizen_phone: Option<String>,
    pub ward_id: Option<i32>,
    pub address: String,
    pub waste_category: WasteCategory,
    pub scheduled_time: DateTime<Utc>,
    pub weight_kg: Option<f64>,
    pub lat: Option<f64>,
    pub lng: Option<f64>,
    #[serde(default)]
    pub notes: String,
}

#[derive(Debug, Deserialize)]
pub struct ListPickupsQuery {
    pub ward_id: Option<i32>,
    pub status: Option<PickupStatus>,
    pub waste_category: Option<WasteCategory>,
    pub phone: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct ListPickupsResponse {
    pub items: Vec<PickupRequestRecord>,
    pub total: i64,
    pub limit: i64,
    pub offset: i64,
}
