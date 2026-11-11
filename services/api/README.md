# Clean Savar Core API (`services/api`)

High-performance Rust (**Axum + Tokio + SQLx + Serde**) and **PostgreSQL 16 + PostGIS 3.4** REST API for the Clean Savar waste management platform.

## Quick Start

### 1. Start PostGIS (Low-RAM Alpine Container)

```bash
cd services/api
cp .env.example .env
docker compose up -d postgres
```

`migrations/001_init.sql` initializes `uuid-ossp`, `postgis`, all domain tables, `GIST` spatial indexes, Savar Municipality Wards 1–9 + 6 Savar Unions, and sample collectors automatically.

### 2. Run the Rust API

```bash
cd services/api
cargo run --release
```

Release binary tuning (`opt-level = "z"`, `lto = true`, `codegen-units = 1`, `strip = true`, `panic = "abort"`) keeps compilation minimal and the compiled binary well under **20 MB**.

> **Disk space tip:** run `cargo clean` periodically to reclaim `target/` build cache space.

## Endpoints (`/api/v1`)

- `GET /api/v1/health` — Database & PostGIS health check
- `POST /api/v1/auth/otp-login` — Generate 6-digit OTP for Bangladeshi mobile (`+8801...` / `01...`)
- `POST /api/v1/auth/verify` — Verify OTP and issue Bearer token
- `GET /api/v1/zones` & `GET /api/v1/zones/resolve?lat=...&lng=...` — Savar wards & unions lookup (`ST_Covers`)
- `POST /api/v1/pickups` & `GET /api/v1/pickups?ward_id=...` — Household waste pickup requests with ward filtering
- `POST /api/v1/complaints` & `GET /api/v1/complaints` — Garbage reports with 50m PostGIS `ST_DWithin` duplicate detection
- `GET /api/v1/workers/nearby` — Top 5 closest online collectors (`ST_DWithin` + `ST_Distance`)
- `PATCH /api/v1/workers/:id/location` — Update collector GPS & online status
- `PATCH /api/v1/collector/tasks/:id/complete` — Idempotent completion using `Idempotency-Key` header
