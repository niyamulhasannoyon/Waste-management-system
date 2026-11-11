use axum::{
    extract::{Multipart, State},
    http::StatusCode,
    Json,
};
use serde::Serialize;
use tokio::fs;
use uuid::Uuid;

use crate::{db::AppState, error::AppError};

#[derive(Serialize)]
pub struct PhotoUploadResponse {
    pub object_key: String,
    pub url: String,
    pub mime_type: String,
    pub size_bytes: usize,
}

fn detect_image_extension(bytes: &[u8]) -> Option<(&'static str, &'static str)> {
    if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        Some(("jpg", "image/jpeg"))
    } else if bytes.starts_with(&[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]) {
        Some(("png", "image/png"))
    } else if bytes.len() >= 12 && &bytes[0..4] == b"RIFF" && &bytes[8..12] == b"WEBP" {
        Some(("webp", "image/webp"))
    } else {
        None
    }
}

pub async fn upload_photo(
    State(state): State<AppState>,
    mut multipart: Multipart,
) -> Result<(StatusCode, Json<PhotoUploadResponse>), AppError> {
    fs::create_dir_all(&state.upload_dir)
        .await
        .map_err(|e| AppError::Internal(format!("failed to prepare upload dir: {e}")))?;

    while let Some(field) = multipart.next_field().await.map_err(|e| {
        AppError::validation(
            format!("Invalid multipart payload: {e}"),
            "ছবি আপলোডের ফরম্যাট সঠিক নয়।",
        )
    })? {
        if field.name() != Some("photo") && field.name() != Some("file") {
            continue;
        }

        let data = field.bytes().await.map_err(|e| {
            AppError::validation(
                format!("Failed reading upload bytes: {e}"),
                "ছবিটি পড়া যায়নি। আবার চেষ্টা করুন।",
            )
        })?;

        if data.is_empty() {
            return Err(AppError::validation(
                "Uploaded photo file is empty.",
                "খালি ফাইল আপলোড করা যাবে না।",
            ));
        }

        if data.len() > state.max_upload_bytes {
            return Err(AppError::PayloadTooLarge {
                message: format!("Photo exceeds {} bytes limit.", state.max_upload_bytes),
                message_bn: "ছবির সাইজ ৫ মেগাবাইটের বেশি হওয়া যাবে না।".to_string(),
            });
        }

        let (ext, mime) = detect_image_extension(&data).ok_or_else(|| {
            AppError::validation(
                "Only JPEG, PNG, or WebP images are accepted.",
                "শুধুমাত্র JPG, PNG অথবা WebP ছবি আপলোড করা যাবে।",
            )
        })?;

        let object_key = format!("{}.{ext}", Uuid::new_v4());
        let file_path = std::path::Path::new(&state.upload_dir).join(&object_key);

        fs::write(&file_path, &data)
            .await
            .map_err(|e| AppError::Internal(format!("failed writing photo: {e}")))?;

        let base = state.public_upload_base_url.trim_end_matches('/');
        let url = format!("{base}/{object_key}");

        return Ok((
            StatusCode::CREATED,
            Json(PhotoUploadResponse {
                object_key,
                url,
                mime_type: mime.to_string(),
                size_bytes: data.len(),
            }),
        ));
    }

    Err(AppError::validation(
        "Missing 'photo' multipart field.",
        "অনুগ্রহ করে একটি ময়লার ছবি সংযুক্ত করুন।",
    ))
}
