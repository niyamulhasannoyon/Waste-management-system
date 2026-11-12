use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use thiserror::Error;
use utoipa::ToSchema;

/// Unified API error type with bilingual (English + Bangla) client-safe messages.
#[derive(Debug, Error)]
pub enum AppError {
    #[error("Validation error: {message}")]
    Validation { message: String, message_bn: String },

    #[error("Unauthorized: {message}")]
    Unauthorized { message: String, message_bn: String },

    #[error("Forbidden: {message}")]
    Forbidden { message: String, message_bn: String },

    #[error("Resource not found: {message}")]
    NotFound { message: String, message_bn: String },

    #[error("Conflict: {message}")]
    Conflict { message: String, message_bn: String },

    #[error("Too many requests: {message}")]
    TooManyRequests { message: String, message_bn: String },

    #[error("Payload too large: {message}")]
    PayloadTooLarge { message: String, message_bn: String },

    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Internal server error: {0}")]
    Internal(String),
}

#[derive(Serialize, ToSchema)]
pub struct ErrorBody {
    pub error: ErrorPayload,
}

#[derive(Serialize, ToSchema)]
pub struct ErrorPayload {
    #[schema(value_type = String)]
    pub code: &'static str,
    pub message: String,
    pub message_bn: String,
}

impl AppError {
    pub fn validation(message: impl Into<String>, message_bn: impl Into<String>) -> Self {
        Self::Validation {
            message: message.into(),
            message_bn: message_bn.into(),
        }
    }

    pub fn unauthorized(message: impl Into<String>, message_bn: impl Into<String>) -> Self {
        Self::Unauthorized {
            message: message.into(),
            message_bn: message_bn.into(),
        }
    }

    pub fn forbidden(message: impl Into<String>, message_bn: impl Into<String>) -> Self {
        Self::Forbidden {
            message: message.into(),
            message_bn: message_bn.into(),
        }
    }

    pub fn not_found(message: impl Into<String>, message_bn: impl Into<String>) -> Self {
        Self::NotFound {
            message: message.into(),
            message_bn: message_bn.into(),
        }
    }

    pub fn conflict(message: impl Into<String>, message_bn: impl Into<String>) -> Self {
        Self::Conflict {
            message: message.into(),
            message_bn: message_bn.into(),
        }
    }

    pub fn too_many_requests(message: impl Into<String>, message_bn: impl Into<String>) -> Self {
        Self::TooManyRequests {
            message: message.into(),
            message_bn: message_bn.into(),
        }
    }

    pub fn client_safe_message(&self) -> String {
        match self {
            Self::Validation { message, .. }
            | Self::Unauthorized { message, .. }
            | Self::Forbidden { message, .. }
            | Self::NotFound { message, .. }
            | Self::Conflict { message, .. }
            | Self::TooManyRequests { message, .. }
            | Self::PayloadTooLarge { message, .. } => message.clone(),
            Self::Database(_) => {
                "A database error occurred while processing this item.".to_string()
            }
            Self::Internal(_) => "Internal server error.".to_string(),
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, code, message, message_bn) = match self {
            Self::Validation {
                message,
                message_bn,
            } => (
                StatusCode::BAD_REQUEST,
                "VALIDATION_ERROR",
                message,
                message_bn,
            ),
            Self::Unauthorized {
                message,
                message_bn,
            } => (
                StatusCode::UNAUTHORIZED,
                "UNAUTHORIZED",
                message,
                message_bn,
            ),
            Self::Forbidden {
                message,
                message_bn,
            } => (StatusCode::FORBIDDEN, "FORBIDDEN", message, message_bn),
            Self::NotFound {
                message,
                message_bn,
            } => (StatusCode::NOT_FOUND, "NOT_FOUND", message, message_bn),
            Self::Conflict {
                message,
                message_bn,
            } => (StatusCode::CONFLICT, "CONFLICT", message, message_bn),
            Self::TooManyRequests {
                message,
                message_bn,
            } => (
                StatusCode::TOO_MANY_REQUESTS,
                "RATE_LIMITED",
                message,
                message_bn,
            ),
            Self::PayloadTooLarge {
                message,
                message_bn,
            } => (
                StatusCode::PAYLOAD_TOO_LARGE,
                "PAYLOAD_TOO_LARGE",
                message,
                message_bn,
            ),
            Self::Database(err) => {
                if let Some(db_err) = err.as_database_error() {
                    match db_err.code().as_deref() {
                        Some("23505") => (
                            StatusCode::CONFLICT,
                            "DUPLICATE_RECORD",
                            "A record with this unique identifier already exists.".to_string(),
                            "এই তথ্যটি ইতিমধ্যেই নিবন্ধিত রয়েছে।".to_string(),
                        ),
                        Some("23503") => (
                            StatusCode::BAD_REQUEST,
                            "INVALID_REFERENCE",
                            "Referenced ward, user, vehicle, or partner does not exist."
                                .to_string(),
                            "নির্বাচিত ওয়ার্ড, ব্যবহারকারী বা গাড়ির তথ্য সঠিক নয়।".to_string(),
                        ),
                        Some("23514") => (
                            StatusCode::BAD_REQUEST,
                            "CONSTRAINT_VIOLATION",
                            "Request value violates a validation constraint.".to_string(),
                            "প্রদত্ত তথ্যটি নির্ধারিত সীমা বা নিয়মের সাথে মিলছে না।".to_string(),
                        ),
                        _ => {
                            tracing::error!(error = %err, "database query error");
                            (
                                StatusCode::INTERNAL_SERVER_ERROR,
                                "DATABASE_ERROR",
                                "A database error occurred while processing your request."
                                    .to_string(),
                                "সার্ভারে তথ্য সংরক্ষণে সমস্যা হয়েছে। একটু পরে আবার চেষ্টা করুন।".to_string(),
                            )
                        }
                    }
                } else {
                    tracing::error!(error = %err, "database connection/driver error");
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        "DATABASE_ERROR",
                        "A database error occurred while processing your request.".to_string(),
                        "সার্ভারে তথ্য সংরক্ষণে সমস্যা হয়েছে। একটু পরে আবার চেষ্টা করুন।".to_string(),
                    )
                }
            }
            Self::Internal(err) => {
                tracing::error!(error = %err, "internal server error");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "INTERNAL_ERROR",
                    "Internal server error.".to_string(),
                    "সার্ভারে সাময়িক সমস্যা হয়েছে।".to_string(),
                )
            }
        };

        (
            status,
            Json(ErrorBody {
                error: ErrorPayload {
                    code,
                    message,
                    message_bn,
                },
            }),
        )
            .into_response()
    }
}
