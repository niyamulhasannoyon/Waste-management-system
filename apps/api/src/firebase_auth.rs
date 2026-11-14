use std::{
    collections::HashMap,
    fs,
    sync::Arc,
    time::{Duration, Instant},
};

use jsonwebtoken::{decode, decode_header, Algorithm, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;

use crate::error::AppError;

const GOOGLE_JWKS_URL: &str =
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const JWKS_CACHE_TTL: Duration = Duration::from_secs(6 * 3600); // 6 hours

#[derive(Debug, Clone, Deserialize)]
struct JwkKey {
    kid: String,
    n: String,
    e: String,
    #[serde(default)]
    #[allow(dead_code)]
    alg: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
struct JwksResponse {
    keys: Vec<JwkKey>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct FirebaseIdentities {
    #[serde(default)]
    pub phone: Vec<String>,
    #[serde(default)]
    pub email: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct FirebaseIdentitiesHolder {
    #[serde(default)]
    pub identities: Option<FirebaseIdentities>,
    #[serde(default)]
    pub sign_in_provider: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct FirebaseClaims {
    pub sub: String,
    pub aud: String,
    pub iss: String,
    pub exp: i64,
    pub iat: i64,
    #[serde(default)]
    pub auth_time: Option<i64>,
    #[serde(default)]
    pub phone_number: Option<String>,
    #[serde(default)]
    pub email: Option<String>,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub firebase: Option<FirebaseIdentitiesHolder>,
}

impl FirebaseClaims {
    /// Extracts the verified phone number from either top-level `phone_number`
    /// or nested `firebase.identities.phone`.
    pub fn extract_phone_number(&self) -> Option<String> {
        if let Some(ref p) = self.phone_number {
            if !p.trim().is_empty() {
                return Some(p.trim().to_string());
            }
        }
        if let Some(ref fb) = self.firebase {
            if let Some(ref ids) = fb.identities {
                if let Some(first) = ids.phone.first() {
                    if !first.trim().is_empty() {
                        return Some(first.trim().to_string());
                    }
                }
            }
        }
        None
    }
}

#[derive(Clone)]
pub struct FirebaseVerifier {
    project_id: String,
    client: reqwest::Client,
    cached_keys: Arc<RwLock<(Instant, HashMap<String, (String, String)>)>>,
}

impl FirebaseVerifier {
    pub fn new(project_id: impl Into<String>) -> Self {
        Self {
            project_id: project_id.into(),
            client: reqwest::Client::builder()
                .timeout(Duration::from_secs(10))
                .build()
                .unwrap_or_default(),
            cached_keys: Arc::new(RwLock::new((
                Instant::now() - JWKS_CACHE_TTL * 2,
                HashMap::new(),
            ))),
        }
    }

    /// Construct verifier by discovering credentials from:
    /// 1. `FIREBASE_SERVICE_ACCOUNT_KEY` (file path or inline JSON)
    /// 2. `GOOGLE_APPLICATION_CREDENTIALS` (file path)
    /// 3. Local `serviceAccountKey.json`
    /// 4. `FIREBASE_PROJECT_ID` env variable
    /// 5. Fallback project ID "clean-savar"
    pub fn from_env_or_file() -> Self {
        let mut discovered_project_id: Option<String> = None;

        // Check file paths
        let candidate_paths = [
            std::env::var("FIREBASE_SERVICE_ACCOUNT_KEY").ok(),
            std::env::var("GOOGLE_APPLICATION_CREDENTIALS").ok(),
            Some("serviceAccountKey.json".to_string()),
            Some("apps/api/serviceAccountKey.json".to_string()),
        ];

        for path_opt in candidate_paths.into_iter().flatten() {
            if let Ok(content) = fs::read_to_string(&path_opt) {
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
                    if let Some(pid) = val.get("project_id").and_then(|v| v.as_str()) {
                        tracing::info!(project_id = pid, path = %path_opt, "Loaded Firebase project credentials");
                        discovered_project_id = Some(pid.to_string());
                        break;
                    }
                }
            } else if path_opt.trim().starts_with('{') {
                // Inline JSON
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(&path_opt) {
                    if let Some(pid) = val.get("project_id").and_then(|v| v.as_str()) {
                        discovered_project_id = Some(pid.to_string());
                        break;
                    }
                }
            }
        }

        let project_id = discovered_project_id
            .or_else(|| std::env::var("FIREBASE_PROJECT_ID").ok())
            .filter(|s| !s.trim().is_empty())
            .unwrap_or_else(|| "clean-savar".to_string());

        Self::new(project_id)
    }

    /// Construct verifier using explicit project ID (e.g. from AppConfig/Secrets.toml) or falling back to environment/file.
    pub fn from_project_id_or_env(preferred_project_id: Option<&str>) -> Self {
        if let Some(pid) = preferred_project_id.map(str::trim).filter(|s| !s.is_empty()) {
            return Self::new(pid);
        }
        Self::from_env_or_file()
    }

    pub fn project_id(&self) -> &str {
        &self.project_id
    }

    async fn get_public_keys(&self) -> Result<HashMap<String, (String, String)>, AppError> {
        {
            let cache = self.cached_keys.read().await;
            if cache.0.elapsed() < JWKS_CACHE_TTL && !cache.1.is_empty() {
                return Ok(cache.1.clone());
            }
        }

        let res = self
            .client
            .get(GOOGLE_JWKS_URL)
            .send()
            .await
            .map_err(|e| {
                tracing::error!(error = %e, "Failed to fetch Google JWKS public keys");
                AppError::Internal(format!("Failed to verify Firebase authentication certificate: {e}"))
            })?;

        let jwks = res
            .json::<JwksResponse>()
            .await
            .map_err(|e| {
                tracing::error!(error = %e, "Failed to parse Google JWKS JSON");
                AppError::Internal(format!("Invalid Google authentication JWKS response: {e}"))
            })?;

        let mut key_map = HashMap::new();
        for key in jwks.keys {
            key_map.insert(key.kid, (key.n, key.e));
        }

        {
            let mut cache = self.cached_keys.write().await;
            *cache = (Instant::now(), key_map.clone());
        }

        Ok(key_map)
    }

    /// Verifies the Firebase ID token and returns decoded claims.
    pub async fn verify_id_token(
        &self,
        id_token: &str,
        allow_dev_mode: bool,
    ) -> Result<FirebaseClaims, AppError> {
        let trimmed = id_token.trim();
        if trimmed.is_empty() {
            return Err(AppError::validation(
                "Firebase ID token is required.",
                "ফায়ারবেস আইডি টোকেন প্রদান করুন।",
            ));
        }

        // Support mock/dev tokens for offline test environments
        if allow_dev_mode {
            if let Some(rest) = trimmed.strip_prefix("dev_token:") {
                let parts: Vec<&str> = rest.split(':').collect();
                let phone = parts.first().copied().unwrap_or("+8801715883210");
                let uid = parts.get(1).copied().unwrap_or("dev-firebase-uid-1234");
                let now = chrono::Utc::now().timestamp();
                return Ok(FirebaseClaims {
                    sub: uid.to_string(),
                    aud: self.project_id.clone(),
                    iss: format!("https://securetoken.google.com/{}", self.project_id),
                    exp: now + 3600,
                    iat: now,
                    auth_time: Some(now),
                    phone_number: Some(phone.to_string()),
                    email: None,
                    name: Some("Dev User".to_string()),
                    firebase: Some(FirebaseIdentitiesHolder {
                        identities: Some(FirebaseIdentities {
                            phone: vec![phone.to_string()],
                            email: vec![],
                        }),
                        sign_in_provider: Some("phone".to_string()),
                    }),
                });
            }
        }

        let token_data = match decode_header(trimmed) {
            Ok(header) if header.alg == Algorithm::RS256 && header.kid.is_some() => {
                let kid = header.kid.unwrap();
                let mut keys = self.get_public_keys().await?;
                let key_pair = match keys.get(&kid) {
                    Some(pair) => Some(pair.clone()),
                    None => {
                        // Key might have rotated, force refresh
                        {
                            let mut cache = self.cached_keys.write().await;
                            cache.0 = Instant::now() - JWKS_CACHE_TTL * 2;
                        }
                        keys = self.get_public_keys().await?;
                        keys.get(&kid).cloned()
                    }
                };

                if let Some((n, e)) = key_pair {
                    if let Ok(decoding_key) = DecodingKey::from_rsa_components(&n, &e) {
                        let mut validation = Validation::new(Algorithm::RS256);
                        validation.set_audience(&[&self.project_id]);
                        validation.set_issuer(&[format!("https://securetoken.google.com/{}", self.project_id)]);
                        validation.validate_exp = true;

                        decode::<FirebaseClaims>(trimmed, &decoding_key, &validation).ok()
                    } else {
                        None
                    }
                } else {
                    None
                }
            }
            _ => None,
        };

        if let Some(token_data) = token_data {
            if token_data.claims.sub.trim().is_empty() {
                return Err(AppError::unauthorized(
                    "Firebase token contains empty subject UID.",
                    "টোকেন ইউজার আইডি সঠিক নয়।",
                ));
            }

            let now = chrono::Utc::now().timestamp();
            if token_data.claims.iat > now + 300 {
                return Err(AppError::unauthorized(
                    "Firebase token issued in the future.",
                    "টোকেন ইস্যুর সময় সঠিক নয়।",
                ));
            }

            if let Some(auth_time) = token_data.claims.auth_time {
                if auth_time > now + 300 {
                    return Err(AppError::unauthorized(
                        "Firebase token auth_time is in the future.",
                        "টোকেন প্রমাণীকরণের সময় সঠিক নয়।",
                    ));
                }
            }

            return Ok(token_data.claims);
        }

        // Fallback: verify as a direct Google OAuth ID token (from mobile Google Sign-In or Web OAuth)
        self.verify_google_oauth_token(trimmed).await
    }

    /// Verifies a direct Google OAuth ID token using Google's official tokeninfo endpoint.
    /// Validates that audience matches configured Android client ID or Web client ID.
    pub async fn verify_google_oauth_token(&self, id_token: &str) -> Result<FirebaseClaims, AppError> {
        let trimmed = id_token.trim();
        if trimmed.is_empty() {
            return Err(AppError::validation(
                "Google ID token is required.",
                "Google আইডি টোকেন প্রদান করুন।",
            ));
        }

        let res = self
            .client
            .get("https://oauth2.googleapis.com/tokeninfo")
            .query(&[("id_token", trimmed)])
            .send()
            .await
            .map_err(|e| {
                tracing::warn!(error = %e, "Failed to reach Google tokeninfo endpoint");
                AppError::unauthorized(
                    "Unable to verify Google authentication token.",
                    "Google টোকেন যাচাই করা যায়নি।",
                )
            })?;

        if !res.status().is_success() {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();
            tracing::warn!(status = %status, body = %body, "Google tokeninfo verification rejected");
            return Err(AppError::unauthorized(
                "Invalid or expired Google authentication token.",
                "Google আইডি টোকেন অবৈধ বা মেয়াদোত্তীর্ণ।",
            ));
        }

        #[derive(Deserialize)]
        struct GoogleTokenInfo {
            sub: String,
            aud: String,
            iss: String,
            #[serde(default)]
            email: Option<String>,
            #[serde(default)]
            name: Option<String>,
            #[serde(default)]
            exp: Option<String>,
            #[serde(default)]
            iat: Option<String>,
        }

        let info = res.json::<GoogleTokenInfo>().await.map_err(|e| {
            tracing::warn!(error = %e, "Failed to parse Google tokeninfo payload");
            AppError::unauthorized(
                "Invalid Google token response format.",
                "Google টোকেন ফরম্যাট সঠিক নয়।",
            )
        })?;

        const DEFAULT_WEB_CLIENT_ID: &str =
            "969714135854-1hd9ek2mkkv7m6s1617jm16pd4e55mhe.apps.googleusercontent.com";
        const DEFAULT_ANDROID_CLIENT_ID: &str =
            "969714135854-c3abr34d896uvqb90ekgjhhpmndkmgsu.apps.googleusercontent.com";

        let web_client_id = std::env::var("GOOGLE_CLIENT_ID")
            .unwrap_or_else(|_| DEFAULT_WEB_CLIENT_ID.to_string());
        let android_client_id = std::env::var("GOOGLE_ANDROID_CLIENT_ID")
            .unwrap_or_else(|_| DEFAULT_ANDROID_CLIENT_ID.to_string());

        let aud_matches = (!web_client_id.is_empty() && info.aud == web_client_id)
            || (!android_client_id.is_empty() && info.aud == android_client_id)
            || info.aud == DEFAULT_WEB_CLIENT_ID
            || info.aud == DEFAULT_ANDROID_CLIENT_ID;

        if !aud_matches {
            tracing::warn!(aud = %info.aud, "Google token audience mismatch");
            return Err(AppError::unauthorized(
                "Google token audience does not match this application.",
                "Google টোকেন এই অ্যাপ্লিকেশনের জন্য প্রযোজ্য নয়।",
            ));
        }

        let now = chrono::Utc::now().timestamp();
        let exp = info.exp.as_deref().and_then(|s| s.parse::<i64>().ok()).unwrap_or(now + 3600);
        let iat = info.iat.as_deref().and_then(|s| s.parse::<i64>().ok()).unwrap_or(now);

        Ok(FirebaseClaims {
            sub: info.sub,
            aud: info.aud,
            iss: info.iss,
            exp,
            iat,
            auth_time: Some(iat),
            phone_number: None,
            email: info.email.clone(),
            name: info.name,
            firebase: Some(FirebaseIdentitiesHolder {
                identities: Some(FirebaseIdentities {
                    phone: vec![],
                    email: info.email.into_iter().collect(),
                }),
                sign_in_provider: Some("google.com".to_string()),
            }),
        })
    }

    /// Verifies a direct Google OAuth Access Token via Google's official userinfo endpoint.
    pub async fn verify_google_access_token(&self, access_token: &str) -> Result<FirebaseClaims, AppError> {
        let trimmed = access_token.trim();
        if trimmed.is_empty() {
            return Err(AppError::validation(
                "Google access token is required.",
                "Google অ্যাক্সেস টোকেন প্রদান করুন।",
            ));
        }

        let res = self
            .client
            .get("https://www.googleapis.com/oauth2/v3/userinfo")
            .bearer_auth(trimmed)
            .send()
            .await
            .map_err(|e| {
                tracing::warn!(error = %e, "Failed to reach Google userinfo endpoint");
                AppError::unauthorized(
                    "Unable to verify Google authentication token.",
                    "Google টোকেন যাচাই করা যায়নি।",
                )
            })?;

        if !res.status().is_success() {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();
            tracing::warn!(status = %status, body = %body, "Google userinfo verification rejected");
            return Err(AppError::unauthorized(
                "Invalid or expired Google access token.",
                "Google অ্যাক্সেস টোকেন অবৈধ বা মেয়াদোত্তীর্ণ।",
            ));
        }

        #[derive(Deserialize)]
        struct GoogleUserInfo {
            sub: String,
            #[serde(default)]
            email: Option<String>,
            #[serde(default)]
            name: Option<String>,
        }

        let info = res.json::<GoogleUserInfo>().await.map_err(|e| {
            tracing::warn!(error = %e, "Failed to parse Google userinfo payload");
            AppError::unauthorized(
                "Invalid Google userinfo response format.",
                "Google তথ্য ফরম্যাট সঠিক নয়।",
            )
        })?;

        let now = chrono::Utc::now().timestamp();
        Ok(FirebaseClaims {
            sub: info.sub,
            aud: self.project_id.clone(),
            iss: "https://accounts.google.com".to_string(),
            exp: now + 3600,
            iat: now,
            auth_time: Some(now),
            phone_number: None,
            email: info.email.clone(),
            name: info.name,
            firebase: Some(FirebaseIdentitiesHolder {
                identities: Some(FirebaseIdentities {
                    phone: vec![],
                    email: info.email.into_iter().collect(),
                }),
                sign_in_provider: Some("google.com".to_string()),
            }),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn parses_dev_token_in_dev_mode() {
        let verifier = FirebaseVerifier::new("clean-savar");
        let claims = verifier
            .verify_id_token("dev_token:+8801715883210:user-abc-123", true)
            .await
            .expect("should decode dev token");

        assert_eq!(claims.sub, "user-abc-123");
        assert_eq!(claims.extract_phone_number(), Some("+8801715883210".to_string()));
        assert_eq!(claims.aud, "clean-savar");
        assert_eq!(claims.iss, "https://securetoken.google.com/clean-savar");
    }

    #[test]
    fn extracts_phone_from_nested_firebase_identities() {
        let claims = FirebaseClaims {
            sub: "user-nested-456".to_string(),
            aud: "clean-savar".to_string(),
            iss: "https://securetoken.google.com/clean-savar".to_string(),
            exp: 1800000000,
            iat: 1700000000,
            auth_time: Some(1700000000),
            phone_number: None,
            email: None,
            name: None,
            firebase: Some(FirebaseIdentitiesHolder {
                identities: Some(FirebaseIdentities {
                    phone: vec!["+8801715883210".to_string()],
                    email: vec![],
                }),
                sign_in_provider: Some("phone".to_string()),
            }),
        };

        assert_eq!(claims.extract_phone_number(), Some("+8801715883210".to_string()));
    }

    #[test]
    fn verifier_uses_explicit_project_id() {
        let verifier = FirebaseVerifier::from_project_id_or_env(Some("clean-savar"));
        assert_eq!(verifier.project_id(), "clean-savar");
    }

    #[tokio::test]
    async fn rejects_empty_or_malformed_token() {
        let verifier = FirebaseVerifier::new("clean-savar");
        assert!(verifier.verify_id_token("", false).await.is_err());
        assert!(verifier.verify_id_token("not-a-jwt", false).await.is_err());
    }
}
