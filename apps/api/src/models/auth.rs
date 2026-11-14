use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

#[derive(Debug, Serialize, FromRow, ToSchema)]
pub struct UserRecord {
    pub id: Uuid,
    pub phone: String,
    pub full_name: String,
    pub role: String,
    pub ward_id: Option<i16>,
    pub is_verified: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct AuthenticatedProfile {
    pub user: UserRecord,
    pub vehicle_id: Option<Uuid>,
    pub partner_id: Option<Uuid>,
    pub partner_name: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct OtpLoginRequest {
    pub phone: String,
    pub full_name: Option<String>,
    pub ward_id: Option<i16>,
    pub role: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct OtpLoginResponse {
    pub phone: String,
    pub expires_in_seconds: i64,
    #[schema(value_type = String)]
    pub message: &'static str,
    #[schema(value_type = String)]
    pub message_bn: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub otp_preview: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct OtpVerifyRequest {
    #[serde(default)]
    pub phone: Option<String>,
    #[serde(default)]
    pub otp: Option<String>,
    #[serde(default, alias = "idToken")]
    pub id_token: Option<String>,
    #[serde(default)]
    pub full_name: Option<String>,
    #[serde(default)]
    pub ward_id: Option<i16>,
    #[serde(default)]
    pub role: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct PhoneLoginRequest {
    #[serde(alias = "idToken")]
    pub id_token: String,
    #[serde(default)]
    pub phone: Option<String>,
    #[serde(default)]
    pub full_name: Option<String>,
    #[serde(default)]
    pub ward_id: Option<i16>,
    #[serde(default)]
    pub role: Option<String>,
}

pub type FirebaseLoginRequest = PhoneLoginRequest;

#[derive(Debug, Serialize, ToSchema)]
pub struct OtpVerifyResponse {
    pub access_token: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token: Option<String>,
    #[schema(value_type = String)]
    pub token_type: &'static str,
    pub expires_in_seconds: i64,
    pub profile: AuthenticatedProfile,
}

#[derive(Debug, Serialize, FromRow, ToSchema)]
pub struct NotificationRecord {
    pub id: Uuid,
    pub title_bn: String,
    pub body_bn: String,
    pub entity_type: Option<String>,
    pub entity_id: Option<Uuid>,
    pub is_read: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, Default, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct PaginationQuery {
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct AccountEraseResponse {
    pub erased_user_id: Uuid,
    pub anonymized_pickups: u64,
    pub anonymized_reports: u64,
    #[schema(value_type = String)]
    pub message: &'static str,
    #[schema(value_type = String)]
    pub message_bn: &'static str,
}

#[derive(Debug, Deserialize, Default, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct RetentionPurgeQuery {
    pub retention_days: Option<i32>,
}

#[derive(Debug, Serialize, FromRow, ToSchema)]
pub struct RetentionPurgeResponse {
    pub purged_otps: i64,
    pub purged_sessions: i64,
    pub purged_idempotency: i64,
    pub anonymized_pickups: i64,
    pub anonymized_reports: i64,
}
