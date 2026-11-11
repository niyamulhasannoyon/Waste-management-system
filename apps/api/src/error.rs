use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use thiserror::Error;

/// Unified API error type with bilingual (English + natural Bangla) error messages.
#[derive(Debug, Error)]
pub enum AppError {
    #[error("Validation error: {message}")]
    Validation {
        message: String,
        message_bn: String,
    },

    #[error("Resource not found: {message}")]
    NotFound {
        message: String,
        message_bn: String,
    },

    #[error("Payload too large: {message}")]
    PayloadTooLarge {
        message: String,
        message_bn: String,
    },

    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Internal server error: {0}")]
    Internal(String),
}

#[derive(Serialize)]
struct ErrorBody {
    error: ErrorPayload,
}

#[derive(Serialize)]
struct ErrorPayload {
    code: &'static str,
    message: String,
    message_bn: String,
}

impl AppError {
    pub fn validation(message: impl Into<String>, message_bn: impl Into<String>) -> Self {
        Self::Validation {
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
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, code, message, message_bn) = match self {
            Self::Validation {
                message,
                message_bn,
            } => (StatusCode::BAD_REQUEST, "VALIDATION_ERROR", message, message_bn),
            Self::NotFound {
                message,
                message_bn,
            } => (StatusCode::NOT_FOUND, "NOT_FOUND", message, message_bn),
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
                tracing::error!(error = %err, "database query failed");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "DATABASE_ERROR",
                    "A database error occurred while processing your request.".to_string(),
                    "সার্ভারে তথ্য সংরক্ষণে সমস্যা হয়েছে। একটু পরে আবার চেষ্টা করুন।".to_string(),
                )
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
