mod auth;
mod config;
mod db;
mod error;
mod models;
mod routes;

use axum::{
    extract::{ConnectInfo, DefaultBodyLimit, Request, State},
    http::{
        header::{AUTHORIZATION, CONTENT_TYPE},
        HeaderName, HeaderValue, Method,
    },
    middleware::{self, Next},
    response::Response,
    Router,
};
use std::net::{IpAddr, SocketAddr};
use tokio::net::TcpListener;
use tower_http::{cors::CorsLayer, services::ServeDir, trace::TraceLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::{
    config::AppConfig,
    db::{init_pool, AppState},
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "clean_savar_api=debug,tower_http=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let cfg = AppConfig::from_env().map_err(|err| {
        tracing::error!(error = %err, "invalid API configuration");
        std::io::Error::new(std::io::ErrorKind::InvalidInput, err)
    })?;

    let pool = init_pool(&cfg.database_url).await?;
    tokio::fs::create_dir_all(&cfg.upload_dir).await?;

    let state = AppState::from_parts(pool, &cfg);

    let origins: Vec<HeaderValue> = cfg
        .cors_allowed_origins
        .iter()
        .filter_map(|o| o.parse::<HeaderValue>().ok())
        .collect();

    let cors = CorsLayer::new()
        .allow_origin(origins)
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PATCH,
            Method::OPTIONS,
        ])
        .allow_headers([
            AUTHORIZATION,
            CONTENT_TYPE,
            HeaderName::from_static("idempotency-key"),
        ]);

    let uploads_service = Router::new()
        .fallback_service(ServeDir::new(&cfg.upload_dir))
        .layer(middleware::from_fn(upload_security_headers));

    let app = Router::new()
        .nest("/api/v1", routes::api_router())
        .nest("/uploads", uploads_service)
        .layer(DefaultBodyLimit::max(cfg.max_upload_bytes + 512 * 1024))
        .layer(middleware::from_fn_with_state(
            state.clone(),
            resolve_client_ip_middleware,
        ))
        .layer(middleware::from_fn(global_security_headers))
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .with_state(state);

    let listener = TcpListener::bind(&cfg.bind_addr).await?;
    tracing::info!("Clean Savar unified API listening on {}", cfg.bind_addr);

    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .with_graceful_shutdown(shutdown_signal())
    .await?;

    Ok(())
}

async fn resolve_client_ip_middleware(
    State(state): State<AppState>,
    mut req: Request,
    next: Next,
) -> Response {
    req.headers_mut().remove("x-resolved-client-ip");
    if let Some(addr) = req.extensions().get::<ConnectInfo<SocketAddr>>().map(|c| c.0) {
        let peer_ip = addr.ip();
        let resolved = if state.trusted_proxy_ips.contains(&peer_ip) {
            req.headers()
                .get("x-real-ip")
                .and_then(|v| v.to_str().ok())
                .map(str::trim)
                .and_then(|s| s.parse::<IpAddr>().ok())
                .or_else(|| {
                    req.headers()
                        .get("x-forwarded-for")
                        .and_then(|v| v.to_str().ok())
                        .and_then(|list| {
                            list.split(',')
                                .rev()
                                .map(str::trim)
                                .filter_map(|s| s.parse::<IpAddr>().ok())
                                .find(|ip| !state.trusted_proxy_ips.contains(ip))
                        })
                })
                .unwrap_or(peer_ip)
        } else {
            peer_ip
        };
        if let Ok(val) = HeaderValue::from_str(&resolved.to_string()) {
            req.headers_mut()
                .insert(HeaderName::from_static("x-resolved-client-ip"), val);
        }
    }
    next.run(req).await
}

async fn global_security_headers(req: Request, next: Next) -> Response {
    let mut res = next.run(req).await;
    let headers = res.headers_mut();
    headers.insert(
        HeaderName::from_static("x-content-type-options"),
        HeaderValue::from_static("nosniff"),
    );
    headers.insert(
        HeaderName::from_static("x-frame-options"),
        HeaderValue::from_static("DENY"),
    );
    headers.insert(
        HeaderName::from_static("referrer-policy"),
        HeaderValue::from_static("no-referrer"),
    );
    res
}

async fn upload_security_headers(req: Request, next: Next) -> Response {
    let mut res = next.run(req).await;
    let headers = res.headers_mut();
    headers.insert(
        HeaderName::from_static("content-security-policy"),
        HeaderValue::from_static("default-src 'none'; sandbox"),
    );
    headers.insert(
        HeaderName::from_static("cache-control"),
        HeaderValue::from_static("public, max-age=86400"),
    );
    res
}

async fn shutdown_signal() {
    let ctrl_c = async {
        let _ = tokio::signal::ctrl_c().await;
    };

    #[cfg(unix)]
    let terminate = async {
        if let Ok(mut sig) = tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
        {
            sig.recv().await;
        }
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    tracing::info!("Shutting down Clean Savar API gracefully");
}
