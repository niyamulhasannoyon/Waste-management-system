# Clean Savar REST API Reference (`/api/v1`)

Machine-readable specification: [`docs/openapi.yaml`](openapi.yaml).

All endpoints are served under `/api/v1` (default local base URL: `http://localhost:8080/api/v1`).

## Authentication & Authorization

- Send Bearer session tokens via `Authorization: Bearer <token>`.
- Roles enforced server-side: `citizen`, `collector`, `partner`, `admin`.
- Public OTP sign-in (`POST /auth/otp-login` -> `POST /auth/otp-verify`) only issues `citizen` accounts (plus explicitly configured `ADMIN_BOOTSTRAP_PHONES` or `partner` when requested and allowed); elevated staff accounts are provisioned administratively.

## Error Envelope & Idempotency

- Structured errors return `{ "error": { "code": "...", "message": "...", "message_bn": "..." } }`.
- Collector completion (`PATCH/POST /collector/tasks/:id/complete`) and batch sync (`POST /collector/sync`) accept `Idempotency-Key` headers / item keys to prevent duplicate state transitions on flaky networks.

## Endpoints Summary

| Method & Path | Auth / Roles | Purpose |
| --- | --- | --- |
| `GET /health` | Public | Liveness & PostgreSQL connectivity check |
| `POST /auth/otp-login` | Public | Request 6-digit Phone OTP challenge (cooldown + IP/phone rate limit) |
| `POST /auth/otp-verify` | Public | Verify OTP and issue session Bearer token + profile |
| `GET /auth/me` | Authenticated | Return active user & collector/partner metadata |
| `POST /auth/logout` | Authenticated | Revoke current Bearer session token |
| `GET /wards` | Public | List Savar Wards `1–9` and Unions `101–106` with `ETag`/`304` support |
| `GET /wards/resolve` | Public | Resolve `lat`, `lng` coordinates to containing/nearest ward or union |
| `GET /analytics/public` | Public | Public municipal KPI summary |
| `GET /analytics/summary` | `admin` | Admin operational dashboard summary (`Asia/Dhaka` day boundaries) |
| `GET /pickups` | Authenticated | Role-scoped pickup requests (`citizen` own, `collector` assigned/own-ward unassigned, `admin` all) |
| `POST /pickups` | Authenticated | Create one-time or `recurring_weekly` pickup request |
| `GET /pickups/track/{code}` | Public / Owner | Track pickup status (`CS-PK-*`); sensitive fields redacted unless owner `?phone=` or authorized token |
| `PATCH /pickups/{id}/status` | `collector`, `admin` | Advance pickup lifecycle status |
| `GET /reports/public` | Public | Public sanitized illegal dumping hotspot feed |
| `GET /reports` | Authenticated | Role-scoped illegal dumping reports |
| `POST /reports` | Authenticated | Submit illegal dump report (`50m` PostGIS `ST_DWithin` duplicate clustering) |
| `GET /reports/track/{code}` | Public / Owner | Track dump report (`CS-DR-*`) with IP/code rate limits and privacy redaction |
| `PATCH /reports/{id}/status` | `collector`, `admin` | Update dump report status and cascade notifications to merged duplicates |
| `GET /dispatch/vehicles` | `collector` (own), `admin` | List municipal collection vehicles |
| `PATCH /dispatch/vehicles/{id}/location` | `collector` (own), `admin` | Update vehicle PostGIS GPS position & duty flag |
| `POST /dispatch/assign` | `admin` | Assign pickup or dump report to a collection vehicle |
| `GET /workers/nearby` | `admin` | PostGIS `ST_DWithin` lookup of nearest active collection vehicles |
| `PATCH` / `POST /collector/tasks/{id}/complete` | `collector` (assigned/ward), `admin` | Mark pickup or dump report complete with numeric weight & optional photo/QR verification |
| `POST /collector/sync` | `collector`, `admin` | Replay queued offline task completions idempotently |
| `GET /partner/lots` | `partner`, `admin` | List recyclable waste lots (`CS-LOT-*`) |
| `POST /partner/lots` | `admin` | Publish recyclable waste lot |
| `POST /partner/lots/{id}/claim` | `partner`, `admin` | Claim open recyclable lot |
| `POST /partner/lots/{id}/collect` | `partner` (claiming), `admin` | Record collection weight and close lot |
| `GET /notifications` | Authenticated | List recent user notifications |
| `PATCH /notifications/{id}/read` | Authenticated | Mark notification as read and return updated record |
| `POST /uploads/photo` | Authenticated | Multipart `photo` upload (magic bytes, dimension limit, EXIF stripped -> JPEG/PNG/WebP) |
