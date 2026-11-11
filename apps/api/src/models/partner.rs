use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, FromRow)]
pub struct RecyclableLotRecord {
    pub id: Uuid,
    pub lot_code: String,
    pub ward_id: i16,
    pub ward_name_bn: String,
    pub material_type: String,
    pub estimated_kg: f64,
    pub pickup_hub_bn: String,
    pub status: String,
    pub claimed_partner_name: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct ClaimLotRequest {
    pub partner_name: String,
}

#[derive(Debug, Serialize, FromRow)]
pub struct StatusEventRecord {
    pub id: Uuid,
    pub entity_type: String,
    pub entity_id: Uuid,
    pub from_status: Option<String>,
    pub to_status: String,
    pub actor_label: String,
    pub note_bn: String,
    pub created_at: DateTime<Utc>,
}
