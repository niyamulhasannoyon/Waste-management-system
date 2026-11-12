use clean_savar_api::{build_router, config::AppConfig, db::AppState};
use serde_json::{json, Value};
use sqlx::{postgres::PgPoolOptions, PgPool};
use std::{collections::HashMap, net::SocketAddr, path::PathBuf};
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::{TcpListener, TcpStream},
    task::JoinHandle,
};
use uuid::Uuid;

struct TestServer {
    addr: SocketAddr,
    pool: PgPool,
    upload_dir: PathBuf,
    server_task: JoinHandle<()>,
}

impl Drop for TestServer {
    fn drop(&mut self) {
        self.server_task.abort();
        let _ = std::fs::remove_dir_all(&self.upload_dir);
    }
}

struct HttpResponse {
    status: u16,
    headers: HashMap<String, String>,
    body: String,
}

impl HttpResponse {
    fn json(&self) -> Value {
        serde_json::from_str(&self.body)
            .unwrap_or_else(|e| panic!("invalid JSON body ({e}): {}", self.body))
    }
}

async fn setup_test_db() -> Option<PgPool> {
    let database_url = std::env::var("DATABASE_URL")
        .ok()
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())?;

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("connect to PostGIS test database");

    let has_wards: Option<String> = sqlx::query_scalar("SELECT to_regclass('public.wards')::text")
        .fetch_one(&pool)
        .await
        .expect("check wards table existence");

    if has_wards.is_none() {
        sqlx::migrate!("./migrations")
            .run(&pool)
            .await
            .expect("apply migrations to empty test database");
    }

    Some(pool)
}

async fn spawn_test_server(pool: PgPool) -> TestServer {
    let upload_dir =
        std::env::temp_dir().join(format!("clean-savar-it-uploads-{}", Uuid::new_v4()));
    std::fs::create_dir_all(&upload_dir).expect("create temp upload directory");

    let cfg = AppConfig {
        app_env: "development".to_string(),
        database_url: String::new(),
        bind_addr: "127.0.0.1:0".to_string(),
        upload_dir: upload_dir.to_string_lossy().into_owned(),
        public_upload_base_url: "http://127.0.0.1/uploads".to_string(),
        max_upload_bytes: 5 * 1024 * 1024,
        cors_allowed_origins: vec!["http://localhost:3000".to_string()],
        trusted_proxy_ips: vec![],
        auth_secret: "integration-test-auth-secret-minimum-32-chars-2026".to_string(),
        otp_dev_mode: true,
        otp_ttl_seconds: 300,
        session_ttl_seconds: 3600,
        duplicate_radius_meters: 50.0,
        nearby_default_radius_meters: 5000.0,
        admin_bootstrap_phones: vec![],
    };

    let state = AppState::from_parts(pool.clone(), &cfg);
    let app = build_router(state, &cfg);

    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .expect("bind ephemeral test port");
    let addr = listener.local_addr().expect("read local addr");

    let server_task = tokio::spawn(async move {
        let make_svc = app.into_make_service_with_connect_info::<SocketAddr>();
        let _ = axum::serve(listener, make_svc).await;
    });

    TestServer {
        addr,
        pool,
        upload_dir,
        server_task,
    }
}

fn decode_chunked_body(raw: &[u8]) -> Vec<u8> {
    let mut out = Vec::new();
    let mut pos = 0;
    while pos < raw.len() {
        let Some(crlf_rel) = raw[pos..].windows(2).position(|w| w == b"\r\n") else {
            break;
        };
        let size_line = std::str::from_utf8(&raw[pos..pos + crlf_rel]).unwrap_or("");
        let hex_part = size_line.split(';').next().unwrap_or("").trim();
        let Ok(chunk_len) = usize::from_str_radix(hex_part, 16) else {
            break;
        };
        pos += crlf_rel + 2;
        if chunk_len == 0 || pos + chunk_len > raw.len() {
            break;
        }
        out.extend_from_slice(&raw[pos..pos + chunk_len]);
        pos += chunk_len + 2;
    }
    out
}

async fn send_http(
    addr: SocketAddr,
    method: &str,
    path: &str,
    bearer: Option<&str>,
    if_none_match: Option<&str>,
    body: Option<Value>,
) -> HttpResponse {
    let mut stream = TcpStream::connect(addr)
        .await
        .expect("connect to test HTTP server");

    let mut req = format!("{method} {path} HTTP/1.1\r\nHost: {addr}\r\nConnection: close\r\n");
    if let Some(tok) = bearer {
        req.push_str(&format!("Authorization: Bearer {tok}\r\n"));
    }
    if let Some(etag) = if_none_match {
        req.push_str(&format!("If-None-Match: {etag}\r\n"));
    }
    if let Some(payload) = body {
        let encoded = payload.to_string();
        req.push_str("Content-Type: application/json\r\n");
        req.push_str(&format!(
            "Content-Length: {}\r\n\r\n{}",
            encoded.len(),
            encoded
        ));
    } else {
        req.push_str("\r\n");
    }

    stream
        .write_all(req.as_bytes())
        .await
        .expect("write HTTP request");

    let mut raw = Vec::new();
    stream
        .read_to_end(&mut raw)
        .await
        .expect("read HTTP response");

    let header_end = raw
        .windows(4)
        .position(|w| w == b"\r\n\r\n")
        .expect("locate HTTP header separator");

    let head_str = String::from_utf8_lossy(&raw[..header_end]);
    let mut lines = head_str.split("\r\n");
    let status_line = lines.next().expect("HTTP status line");
    let status = status_line
        .split_whitespace()
        .nth(1)
        .and_then(|s| s.parse::<u16>().ok())
        .expect("HTTP status code");

    let mut headers = HashMap::new();
    for line in lines {
        if let Some((k, v)) = line.split_once(':') {
            headers.insert(k.trim().to_ascii_lowercase(), v.trim().to_string());
        }
    }

    let raw_body = &raw[header_end + 4..];
    let is_chunked = headers
        .get("transfer-encoding")
        .is_some_and(|v| v.to_ascii_lowercase().contains("chunked"));
    let decoded_body = if is_chunked {
        decode_chunked_body(raw_body)
    } else {
        raw_body.to_vec()
    };

    HttpResponse {
        status,
        headers,
        body: String::from_utf8_lossy(&decoded_body).into_owned(),
    }
}

#[tokio::test]
async fn health_openapi_and_security_headers_work_against_postgis() {
    let Some(pool) = setup_test_db().await else {
        return;
    };
    let server = spawn_test_server(pool).await;

    let health = send_http(server.addr, "GET", "/api/v1/health", None, None, None).await;
    assert_eq!(health.status, 200);
    assert_eq!(
        health
            .headers
            .get("x-content-type-options")
            .map(String::as_str),
        Some("nosniff")
    );
    assert_eq!(
        health.headers.get("x-frame-options").map(String::as_str),
        Some("DENY")
    );

    let health_json = health.json();
    assert_eq!(health_json["status"], "ok");
    let pg_ver = health_json["postgis_version"].as_str().unwrap_or("");
    assert!(!pg_ver.is_empty());

    let openapi = send_http(server.addr, "GET", "/api/v1/openapi.json", None, None, None).await;
    assert_eq!(openapi.status, 200);
    let spec = openapi.json();
    assert!(spec["paths"]["/api/v1/pickups"].is_object());
    assert!(spec["components"]["securitySchemes"]["bearerAuth"].is_object());
}

#[tokio::test]
async fn wards_etag_304_and_spatial_resolve_work() {
    let Some(pool) = setup_test_db().await else {
        return;
    };
    let server = spawn_test_server(pool).await;

    let wards = send_http(server.addr, "GET", "/api/v1/wards", None, None, None).await;
    assert_eq!(wards.status, 200);
    let etag = wards
        .headers
        .get("etag")
        .cloned()
        .expect("ETag header on /wards");
    let ward_rows = wards.json();
    assert!(ward_rows.as_array().is_some_and(|rows| rows.len() >= 15));

    let cached = send_http(server.addr, "GET", "/api/v1/wards", None, Some(&etag), None).await;
    assert_eq!(cached.status, 304);

    let resolved = send_http(
        server.addr,
        "GET",
        "/api/v1/wards/resolve?lat=23.8483&lng=90.2602",
        None,
        None,
        None,
    )
    .await;
    assert_eq!(resolved.status, 200);
    let resolved_json = resolved.json();
    assert!(resolved_json["ward_id"].as_i64().unwrap_or(0) >= 1);
}

#[tokio::test]
async fn otp_rbac_pickup_masking_and_account_erasure_work_end_to_end() {
    let Some(pool) = setup_test_db().await else {
        return;
    };
    let server = spawn_test_server(pool).await;

    let uniq = Uuid::new_v4().as_u128();
    let phone = format!("017{:08}", (uniq % 80_000_000) + 10_000_000);
    let formatted_phone = format!("{}-{}", &phone[..5], &phone[5..]);

    // 1. Public OTP login attempts to pass role="collector"; server must never grant staff roles.
    let login = send_http(
        server.addr,
        "POST",
        "/api/v1/auth/otp-login",
        None,
        None,
        Some(json!({
            "phone": phone,
            "full_name": "Integration Citizen",
            "ward_id": 1,
            "role": "collector"
        })),
    )
    .await;
    assert_eq!(login.status, 200);
    let login_json = login.json();
    let otp = login_json["otp_preview"]
        .as_str()
        .expect("otp_preview in dev test mode")
        .to_string();

    // 2. Wrong OTP must be rejected with 401.
    let wrong = send_http(
        server.addr,
        "POST",
        "/api/v1/auth/otp-verify",
        None,
        None,
        Some(json!({
            "phone": phone,
            "otp": "000000"
        })),
    )
    .await;
    assert_eq!(wrong.status, 401);

    // 3. Valid OTP issues Bearer token with strictly 'citizen' role.
    let verify = send_http(
        server.addr,
        "POST",
        "/api/v1/auth/otp-verify",
        None,
        None,
        Some(json!({
            "phone": phone,
            "otp": otp
        })),
    )
    .await;
    assert_eq!(verify.status, 200);
    let verify_json = verify.json();
    assert_eq!(verify_json["profile"]["user"]["role"], "citizen");
    let user_id_str = verify_json["profile"]["user"]["id"]
        .as_str()
        .expect("user id");
    let user_id = Uuid::parse_str(user_id_str).expect("valid user UUID");
    let token = verify_json["access_token"]
        .as_str()
        .expect("access token")
        .to_string();

    // 4. Citizen cannot access collector/admin dispatch fleet endpoints.
    let forbidden = send_http(
        server.addr,
        "GET",
        "/api/v1/dispatch/vehicles",
        Some(&token),
        None,
        None,
    )
    .await;
    assert_eq!(forbidden.status, 403);

    // 5. Create pickup as authenticated citizen.
    let created = send_http(
        server.addr,
        "POST",
        "/api/v1/pickups",
        Some(&token),
        None,
        Some(json!({
            "ward_id": 1,
            "address_line": "House 12, Bank Town, Savar",
            "landmark": "Bank Town Mosque",
            "waste_type": "household",
            "slot": "morning",
            "schedule_type": "one_time",
            "estimated_bags": 2,
            "lat": 23.8483,
            "lng": 90.2602,
            "notes": "Call at gate"
        })),
    )
    .await;
    assert_eq!(created.status, 201);
    let pickup_json = created.json();
    let pickup_id_str = pickup_json["id"].as_str().expect("pickup id");
    let pickup_id = Uuid::parse_str(pickup_id_str).expect("UUID");
    let tracking_code = pickup_json["tracking_code"]
        .as_str()
        .expect("tracking code")
        .to_string();

    // 6. Public unauthenticated tracking masks phone & address; owner sees full details.
    let track_path = format!("/api/v1/pickups/track/{tracking_code}");
    let public_track = send_http(server.addr, "GET", &track_path, None, None, None).await;
    assert_eq!(public_track.status, 200);
    let public_json = public_track.json();
    let masked_phone = public_json["pickup"]["citizen_phone"]
        .as_str()
        .unwrap_or("");
    assert!(masked_phone.contains("••••"));
    assert_eq!(
        public_json["pickup"]["address_line"],
        "গোপনীয় ঠিকানা (যাচাইকৃত লগইন বা ফোন নম্বরে দৃশ্যমান)"
    );

    let owner_track = send_http(server.addr, "GET", &track_path, Some(&token), None, None).await;
    assert_eq!(owner_track.status, 200);
    let owner_json = owner_track.json();
    assert_eq!(
        owner_json["pickup"]["address_line"],
        "House 12, Bank Town, Savar"
    );

    // 7. Self-erasure anonymizes PII, revokes active token, and writes audit log.
    let erase = send_http(
        server.addr,
        "POST",
        "/api/v1/auth/erase",
        Some(&token),
        None,
        None,
    )
    .await;
    assert_eq!(erase.status, 200);
    assert_eq!(erase.json()["anonymized_pickups"], 1);

    let me_after = send_http(
        server.addr,
        "GET",
        "/api/v1/auth/me",
        Some(&token),
        None,
        None,
    )
    .await;
    assert_eq!(me_after.status, 401);

    let user_check_sql = "SELECT phone, anonymized_at IS NOT NULL FROM users WHERE id = $1";
    let (stored_phone, has_anon_ts): (String, bool) = sqlx::query_as(user_check_sql)
        .bind(user_id)
        .fetch_one(&server.pool)
        .await
        .expect("read erased user record");
    assert!(stored_phone.starts_with("del-"));
    assert!(has_anon_ts);

    // Clean up test records so local/CI runs remain idempotent.
    let _ = sqlx::query("DELETE FROM status_events WHERE entity_id = $1")
        .bind(pickup_id)
        .execute(&server.pool)
        .await;
    let _ = sqlx::query("DELETE FROM pickup_requests WHERE id = $1")
        .bind(pickup_id)
        .execute(&server.pool)
        .await;
    let _ = sqlx::query("DELETE FROM audit_logs WHERE actor_user_id = $1 OR entity_id = $1")
        .bind(user_id)
        .execute(&server.pool)
        .await;
    let _ = sqlx::query("DELETE FROM notifications WHERE user_id = $1")
        .bind(user_id)
        .execute(&server.pool)
        .await;
    let _ = sqlx::query("DELETE FROM auth_sessions WHERE user_id = $1")
        .bind(user_id)
        .execute(&server.pool)
        .await;
    let _ = sqlx::query("DELETE FROM otp_codes WHERE phone = $1")
        .bind(&formatted_phone)
        .execute(&server.pool)
        .await;
    let _ = sqlx::query("DELETE FROM users WHERE id = $1")
        .bind(user_id)
        .execute(&server.pool)
        .await;
}
