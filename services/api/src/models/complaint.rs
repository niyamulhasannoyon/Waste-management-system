use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Type};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[sqlx(type_name = "complaint_status", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum ComplaintStatus {
    Open,
    InProgress,
    Resolved,
    Duplicate,
    Rejected,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[sqlx(type_name = "complaint_category", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum ComplaintCategory {
    IllegalDumping,
    OverflowingBin,
    BlockedDrain,
    MarketWaste,
    ConstructionDebris,
    HazardousWaste,
}

#[derive(Debug, Serialize, FromRow)]
pub struct ComplaintRecord {
    pub id: Uuid,
    pub tracking_code: String,
    pub user_id: Option<Uuid>,
    pub ward_id: i32,
    pub ward_code: String,
    pub ward_name_en: String,
    pub ward_name_bn: String,
    pub assigned_worker_id: Option<Uuid>,
    pub reporter_phone: String,
    pub category: ComplaintCategory,
    pub description: String,
    pub landmark: String,
    pub photo_url: Option<String>,
    pub lat: f64,
    pub lng: f64,
    pub status: ComplaintStatus,
    pub duplicate_of: Option<Uuid>,
    pub duplicate_count: i32,
    pub resolved_photo_url: Option<String>,
    pub resolved_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateComplaintRequest {
    pub reporter_phone: Option<String>,
    pub ward_id: Option<i32>,
    pub category: ComplaintCategory,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub landmark: String,
    pub photo_url: Option<String>,
    pub lat: f64,
    pub lng: f64,
}

#[derive(Debug, Serialize)]
pub struct CreateComplaintResponse {
    pub is_duplicate: bool,
    pub duplicate_of: Option<Uuid>,
    pub duplicate_of_tracking_code: Option<String>,
    pub duplicate_distance_meters: Option<f64>,
    pub complaint: ComplaintRecord,
}

#[derive(Debug, Deserialize)]
pub struct ListComplaintsQuery {
    pub ward_id: Option<i32>,
    pub status: Option<ComplaintStatus>,
    pub include_duplicates: Option<bool>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}
