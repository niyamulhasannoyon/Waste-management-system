use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, FromRow)]
pub struct UserRecord {
    pub id: Uuid,
    pub phone: String,
    pub full_name: String,
    pub role: String,
    pub ward_id: Option<i16>,
    pub is_verified: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct AuthenticatedProfile {
    pub user: UserRecord,
    pub vehicle_id: Option<Uuid>,
    pub partner_id: Option<Uuid>,
    pub partner_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct OtpLoginRequest {
    pub phone: String,
    pub full_name: Option<String>,
    pub ward_id: Option<i16>,
    pub role: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct OtpLoginResponse {
    pub phone: String,
    pub expires_in_seconds: i64,
    pub message: &'static str,
    pub message_bn: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub otp_preview: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct OtpVerifyRequest {
    pub phone: String,
    pub otp: String,
}

#[derive(Debug, Serialize)]
pub struct OtpVerifyResponse {
    pub access_token: String,
    pub token_type: &'static str,
    pub expires_in_seconds: i64,
    pub profile: AuthenticatedProfile,
}

#[derive(Debug, Serialize, FromRow)]
pub struct NotificationRecord {
    pub id: Uuid,
    pub title_bn: String,
    pub body_bn: String,
    pub entity_type: Option<String>,
    pub entity_id: Option<Uuid>,
    pub is_read: bool,
    pub created_at: DateTime<Utc>,
}
