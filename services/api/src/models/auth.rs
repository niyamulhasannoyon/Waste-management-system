use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Type};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[sqlx(type_name = "user_role", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum UserRole {
    Citizen,
    Collector,
    Dispatcher,
    Admin,
}

#[derive(Debug, Serialize, FromRow)]
pub struct UserRecord {
    pub id: Uuid,
    pub phone: String,
    pub full_name: String,
    pub role: UserRole,
    pub ward_id: Option<i32>,
    pub is_verified: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct OtpLoginRequest {
    pub phone: String,
    pub full_name: Option<String>,
    pub ward_id: Option<i32>,
    pub role: Option<UserRole>,
}

#[derive(Debug, Serialize)]
pub struct OtpLoginResponse {
    pub phone: String,
    pub expires_in_seconds: i64,
    pub message: &'static str,
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
    pub user: UserRecord,
}
