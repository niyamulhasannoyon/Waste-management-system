use axum::{
    extract::{Multipart, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use image::{imageops::FilterType, ImageFormat, ImageReader, Limits};
use serde::Serialize;
use std::io::Cursor;
use tokio::fs;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::{
    auth::{extract_client_ip, require_role, Role},
    db::AppState,
    error::{AppError, ErrorBody},
};

#[derive(Serialize, ToSchema)]
pub struct PhotoUploadResponse {
    pub object_key: String,
    pub url: String,
    pub mime_type: String,
    pub size_bytes: usize,
}

#[allow(dead_code)]
#[derive(ToSchema)]
pub struct PhotoUploadForm {
    #[schema(content_media_type = "application/octet-stream")]
    pub photo: Vec<u8>,
}

#[derive(Clone, Copy)]
enum InputKind {
    Jpeg,
    Png,
    Webp,
}

fn detect_image_kind(bytes: &[u8]) -> Option<InputKind> {
    if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        Some(InputKind::Jpeg)
    } else if bytes.starts_with(&[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]) {
        Some(InputKind::Png)
    } else if bytes.len() >= 12 && &bytes[0..4] == b"RIFF" && &bytes[8..12] == b"WEBP" {
        Some(InputKind::Webp)
    } else {
        None
    }
}

/// Decode, dimension-bound, strip EXIF/GPS metadata, and re-encode uploaded image pixels safely.
fn sanitize_and_reencode_image(
    bytes: &[u8],
    kind: InputKind,
) -> Result<(Vec<u8>, &'static str, &'static str), AppError> {
    let src_format = match kind {
        InputKind::Jpeg => ImageFormat::Jpeg,
        InputKind::Png => ImageFormat::Png,
        InputKind::Webp => ImageFormat::WebP,
    };

    let (w, h) = ImageReader::with_format(Cursor::new(bytes), src_format)
        .into_dimensions()
        .map_err(|_| {
            AppError::validation(
                "Invalid or corrupted image file.",
                "ছবিটি পড়া যায়নি বা ক্ষতিগ্রস্ত। অনুগ্রহ করে সঠিক JPG, PNG বা WebP ছবি দিন।",
            )
        })?;

    if w == 0 || h == 0 || w > 8000 || h > 8000 {
        return Err(AppError::validation(
            "Image dimensions must be between 1×1 and 8000×8000 pixels.",
            "ছবির রেজোলিউশন সঠিক নয় (সর্বোচ্চ ৮০০০×৮০০০ পিক্সেল)।",
        ));
    }

    let mut limits = Limits::default();
    limits.max_image_width = Some(8000);
    limits.max_image_height = Some(8000);
    limits.max_alloc = Some(128 * 1024 * 1024);

    let mut reader = ImageReader::with_format(Cursor::new(bytes), src_format);
    reader.limits(limits);
    let img = reader.decode().map_err(|_| {
        AppError::validation(
            "Invalid or oversized image payload.",
            "ছবিটি ডিকোড করা যায়নি বা অনুমোদিত মেমরি সীমা অতিক্রম করেছে।",
        )
    })?;

    let resized = if w > 1600 || h > 1600 {
        img.resize(1600, 1600, FilterType::Triangle)
    } else {
        img
    };

    let mut clean_bytes = Vec::new();
    match kind {
        InputKind::Png => {
            resized
                .write_to(&mut Cursor::new(&mut clean_bytes), ImageFormat::Png)
                .map_err(|e| AppError::Internal(format!("png encode error: {e}")))?;
            Ok((clean_bytes, "png", "image/png"))
        }
        InputKind::Jpeg | InputKind::Webp => {
            let rgb = image::DynamicImage::ImageRgb8(resized.to_rgb8());
            rgb.write_to(&mut Cursor::new(&mut clean_bytes), ImageFormat::Jpeg)
                .map_err(|e| AppError::Internal(format!("jpeg encode error: {e}")))?;
            Ok((clean_bytes, "jpg", "image/jpeg"))
        }
    }
}

/// `POST /api/v1/uploads/photo`
/// Authenticated, rate-limited, EXIF-stripping image upload endpoint.
#[utoipa::path(
    post,
    path = "/api/v1/uploads/photo",
    tag = "Uploads",
    security(("bearerAuth" = [])),
    request_body(content = PhotoUploadForm, content_type = "multipart/form-data"),
    responses(
        (status = 201, description = "Sanitized image uploaded", body = PhotoUploadResponse),
        (status = 400, description = "Unsupported or corrupted image", body = ErrorBody),
        (status = 413, description = "Payload too large", body = ErrorBody),
        (status = 429, description = "Rate limit exceeded", body = ErrorBody)
    )
)]
pub async fn upload_photo(
    State(state): State<AppState>,
    headers: HeaderMap,
    mut multipart: Multipart,
) -> Result<(StatusCode, Json<PhotoUploadResponse>), AppError> {
    let auth_user = require_role(
        &state,
        &headers,
        &[Role::Citizen, Role::Collector, Role::Admin],
    )
    .await?;

    let ip = extract_client_ip(&headers);
    state
        .rate_limiter
        .check(&format!("upload_user:{}", auth_user.user_id), 25, 600)
        .await?;
    state
        .rate_limiter
        .check(&format!("upload_ip:{ip}"), 40, 600)
        .await?;

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
            let max_mb = (state.max_upload_bytes as f64) / (1024.0 * 1024.0);
            let max_mb_label = if state.max_upload_bytes % (1024 * 1024) == 0 {
                format!("{}", state.max_upload_bytes / (1024 * 1024))
            } else {
                format!("{max_mb:.1}")
            };
            return Err(AppError::PayloadTooLarge {
                message: format!("Photo exceeds {} bytes limit.", state.max_upload_bytes),
                message_bn: format!("ছবির সাইজ {max_mb_label} মেগাবাইটের বেশি হওয়া যাবে না।"),
            });
        }

        let kind = detect_image_kind(&data).ok_or_else(|| {
            AppError::validation(
                "Only JPEG, PNG, or WebP images are accepted.",
                "শুধুমাত্র JPG, PNG অথবা WebP ছবি আপলোড করা যাবে।",
            )
        })?;

        let raw_vec = data.to_vec();
        let (clean_bytes, ext, mime) =
            tokio::task::spawn_blocking(move || sanitize_and_reencode_image(&raw_vec, kind))
                .await
                .map_err(|e| AppError::Internal(format!("image worker panicked: {e}")))??;

        let object_key = format!("{}.{ext}", Uuid::new_v4());
        let file_path = std::path::Path::new(&state.upload_dir).join(&object_key);

        fs::write(&file_path, &clean_bytes)
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
                size_bytes: clean_bytes.len(),
            }),
        ));
    }

    Err(AppError::validation(
        "Missing 'photo' multipart field.",
        "অনুগ্রহ করে একটি ময়লার ছবি সংযুক্ত করুন।",
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::{ImageBuffer, Rgb};

    #[test]
    fn detects_magic_bytes_and_reencodes_without_metadata() {
        let img = ImageBuffer::from_pixel(4, 4, Rgb([34u8, 139u8, 34u8]));
        let mut raw_png = Vec::new();
        image::DynamicImage::ImageRgb8(img)
            .write_to(&mut Cursor::new(&mut raw_png), ImageFormat::Png)
            .expect("encode png");

        assert!(matches!(detect_image_kind(&raw_png), Some(InputKind::Png)));
        assert!(detect_image_kind(b"not an image").is_none());

        let (clean, ext, mime) =
            sanitize_and_reencode_image(&raw_png, InputKind::Png).expect("reencode");
        assert_eq!(ext, "png");
        assert_eq!(mime, "image/png");
        assert!(detect_image_kind(&clean).is_some());
    }
}
