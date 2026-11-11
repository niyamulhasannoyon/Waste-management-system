use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;

/// Unified API error type mapped cleanly to structured JSON HTTP responses.
#[derive(Debug)]
pub enum AppError {
    Validation { code: &'static str, message: String },
    Unauthorized { code: &'static str, message: String },
    Forbidden { code: &'static str, message: String },
    NotFound { code: &'static str, message: String },
    Conflict { code: &'static str, message: String },
    TooManyRequests { code: &'static str, message: String },
    Database(sqlx::Error),
    Internal(String),
}

#[derive(Serialize)]
struct ErrorEnvelope {
    error: ErrorBody,
}

#[derive(Serialize)]
struct ErrorBody {
    code: &'static str,
    message: String,
}

impl AppError {
    pub fn validation(code: &'static str, message: impl Into<String>) -> Self {
        Self::Validation {
            code,
            message: message.into(),
        }
    }

    pub fn unauthorized(code: &'static str, message: impl Into<String>) -> Self {
        Self::Unauthorized {
            code,
            message: message.into(),
        }
    }

    pub fn forbidden(code: &'static str, message: impl Into<String>) -> Self {
        Self::Forbidden {
            code,
            message: message.into(),
        }
    }

    pub fn not_found(code: &'static str, message: impl Into<String>) -> Self {
        Self::NotFound {
            code,
            message: message.into(),
        }
    }

    pub fn conflict(code: &'static str, message: impl Into<String>) -> Self {
        Self::Conflict {
            code,
            message: message.into(),
        }
    }

    pub fn too_many_requests(code: &'static str, message: impl Into<String>) -> Self {
        Self::TooManyRequests {
            code,
            message: message.into(),
        }
    }

    pub fn internal(message: impl Into<String>) -> Self {
        Self::Internal(message.into())
    }
}

impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        Self::Database(err)
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, code, message) = match self {
            Self::Validation { code, message } => (StatusCode::BAD_REQUEST, code, message),
            Self::Unauthorized { code, message } => (StatusCode::UNAUTHORIZED, code, message),
            Self::Forbidden { code, message } => (StatusCode::FORBIDDEN, code, message),
            Self::NotFound { code, message } => (StatusCode::NOT_FOUND, code, message),
            Self::Conflict { code, message } => (StatusCode::CONFLICT, code, message),
            Self::TooManyRequests { code, message } => {
                (StatusCode::TOO_MANY_REQUESTS, code, message)
            }
            Self::Database(err) => {
                if let Some(db_err) = err.as_database_error() {
                    match db_err.code().as_deref() {
                        Some("23505") => (
                            StatusCode::CONFLICT,
                            "DUPLICATE_RECORD",
                            "A record with this unique identifier already exists.".to_string(),
                        ),
                        Some("23503") => (
                            StatusCode::BAD_REQUEST,
                            "INVALID_REFERENCE",
                            "Referenced ward, user, or worker does not exist.".to_string(),
                        ),
                        Some("23514") => (
                            StatusCode::BAD_REQUEST,
                            "CONSTRAINT_VIOLATION",
                            "Request field violates a database constraint.".to_string(),
                        ),
                        _ => {
                            tracing::error!(error = %err, "database query error");
                            (
                                StatusCode::INTERNAL_SERVER_ERROR,
                                "DATABASE_ERROR",
                                "A database error occurred while processing the request.".to_string(),
                            )
                        }
                    }
                } else {
                    tracing::error!(error = %err, "database error");
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        "DATABASE_ERROR",
                        "A database error occurred while processing the request.".to_string(),
                    )
                }
            }
            Self::Internal(err) => {
                tracing::error!(error = %err, "internal server error");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "INTERNAL_ERROR",
                    "Internal server error.".to_string(),
                )
            }
        };

        (
            status,
            Json(ErrorEnvelope {
                error: ErrorBody { code, message },
            }),
        )
            .into_response()
    }
}
