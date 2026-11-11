use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Type};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[sqlx(type_name = "worker_task_type", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum WorkerTaskType {
    Pickup,
    Complaint,
}

#[derive(Debug, Serialize, FromRow)]
pub struct NearbyWorkerRecord {
    pub id: Uuid,
    pub full_name: String,
    pub phone: String,
    pub vehicle_type: String,
    pub vehicle_code: String,
    pub ward_id: Option<i32>,
    pub ward_name_en: Option<String>,
    pub ward_name_bn: Option<String>,
    pub is_online: bool,
    pub lat: f64,
    pub lng: f64,
    pub distance_meters: f64,
    pub last_seen_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct NearbyWorkersQuery {
    pub pickup_id: Option<Uuid>,
    pub complaint_id: Option<Uuid>,
    pub lat: Option<f64>,
    pub lng: Option<f64>,
    pub radius_meters: Option<f64>,
    pub limit: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct NearbyWorkersResponse {
    pub target_lat: f64,
    pub target_lng: f64,
    pub radius_meters: f64,
    pub count: usize,
    pub workers: Vec<NearbyWorkerRecord>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateWorkerLocationRequest {
    pub lat: f64,
    pub lng: f64,
    pub is_online: Option<bool>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct WorkerLocationRecord {
    pub id: Uuid,
    pub full_name: String,
    pub phone: String,
    pub vehicle_type: String,
    pub vehicle_code: String,
    pub ward_id: Option<i32>,
    pub is_online: bool,
    pub lat: f64,
    pub lng: f64,
    pub last_seen_at: DateTime<Utc>,
}

#[derive(Debug, Default, Deserialize)]
pub struct CompleteTaskRequest {
    pub task_type: Option<WorkerTaskType>,
    pub worker_id: Option<Uuid>,
    pub weight_kg: Option<f64>,
    pub completion_photo_url: Option<String>,
    #[serde(default)]
    pub notes: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CompleteTaskResponse {
    pub completion_id: Uuid,
    pub task_type: WorkerTaskType,
    pub task_id: Uuid,
    pub tracking_code: String,
    pub status: String,
    pub worker_id: Option<Uuid>,
    pub weight_kg: Option<f64>,
    pub completion_photo_url: Option<String>,
    pub completed_at: DateTime<Utc>,
    pub idempotency_key: String,
}
