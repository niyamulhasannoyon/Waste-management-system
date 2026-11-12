# Clean Savar (ক্লিন সাভার) — Architecture Blueprint

## 1. System Overview

Clean Savar connects four user groups across **Savar Pourashava (Wards 1–9)** and **6 surrounding unions (101–106)** through one unified **Rust + PostGIS** core API (`apps/api`):

1. **Citizens (নাগরিক):** Web portal (`/`, `/login`, `/pickup`, `/report`, `/track`) and unified Flutter App Citizen Mode (`apps/mobile`) to schedule one-time or recurring weekly pickups, submit geo-tagged dump photo reports, receive status notifications, and verify tracking codes.
2. **Municipality Dispatchers (সাভার পৌরসভা অপস):** Next.js Admin Dashboard (`/admin`) with ward/status search filters, PostGIS nearest-vehicle dispatch, recyclable lot management, and formula-injection-safe CSV export.
3. **Field Collectors (সংগ্রহকারী):** Next.js Collector Workspace (`/collector`) and Flutter Collector Mode (`apps/mobile`, gated by OTP role in release builds) supporting outdoor high-contrast controls, QR tag verification, throttled vehicle GPS pings, and SHA-256 idempotent task completion / batch offline sync.
4. **Recycling Partners (পার্টনার পোর্টাল):** Next.js Partner Portal (`/partner`) for claiming and collecting verified recyclable lots (`CS-LOT-*`).

```text
+-----------------------+      +-------------------------+
| Next.js 15 Web App    |      | Flutter Mobile App      |
| - /        /login     |      | - Citizen Mode          |
| - /pickup  /report    |      | - Collector Mode        |
| - /track   /collector |      | (shared clean_savar_core|
| - /partner /admin     |      |  in packages/)          |
+-----------+-----------+      +------------+------------+
            |                               |
            +---------------+---------------+
                            | HTTPS / JSON + Multipart
                            | (Bearer OTP Sessions & RBAC)
                            v
               +-------------------------+
               | Rust API (Axum + SQLx)  |
               | - OTP Auth & RBAC       |
               | - Spatial Ward Lookup   |
               | - 50m Duplicate Merge   |
               | - EXIF-Stripped Uploads |
               | - State Machines & Sync |
               +------------+------------+
                            | SQLx + PostGIS
                            v
               +-------------------------+
               | PostgreSQL 16 + PostGIS |
               | - wards (1-9, 101-106)  |
               | - users / auth_sessions |
               | - pickup_requests (Pt)  |
               | - dump_reports (Pt)     |
               | - collector_vehicles    |
               | - recyclable_lots       |
               | - notifications         |
               | - idempotency_keys      |
               | - status_events         |
               +-------------------------+
```

---

## 2. Geospatial Data Model & Security (`apps/api`)

Migrations (`0001_init_postgis.sql` + `0002_seed_savar_wards.sql`) run via SQLx on API startup. All geometries use **SRID 4326 (WGS 84)**:

- **`wards`**: Stores Savar Pourashava **Wards `1–9`** and Unions **`101–106`** (Tetuljhora, Ashulia, Birulia, Aminbazar, Savar Sadar, Pathalia) as `GEOMETRY(MultiPolygon, 4326)` with GIST indexing.
  - Auto-ward resolution (`GET /api/v1/wards/resolve`) runs `ST_Contains` with nearest-centroid fallback (`boundary <-> point`).
- **Authentication & RBAC (`users`, `otp_codes`, `auth_sessions`)**:
  - `POST /api/v1/auth/otp-login` -> rate-limited 6-digit challenge (HMAC-SHA256 hashed with explicit `AUTH_SECRET`, constant-time verified via `POST /api/v1/auth/otp-verify`, Bearer tokens stored hashed in `auth_sessions`, inspected via `GET /api/v1/auth/me` and revoked via `POST /api/v1/auth/logout`).
  - Pre-seeded test roles and explicit `ADMIN_BOOTSTRAP_PHONES` enforce least-privilege RBAC across `citizen`, `collector`, `partner`, and `admin`.
- **`pickup_requests` (`CS-PK-*`) & State Machine**:
  - Supports `one_time` and `recurring_weekly` (`preferred_day`) pickups with validated transitions (`pending -> assigned -> in_progress -> collected` or `cancelled`).
- **`dump_reports` (`CS-DR-*`) & 50m Deduplication**:
  - Uses `ST_DWithin` within `COMPLAINT_DUPLICATE_RADIUS_METERS` (default `50m`) to cluster nearby active complaints rather than creating duplicate dispatches, while sanitizing PII (`reporter_name`, `reporter_phone`) out of `GET /api/v1/reports/public`.
- **Media Upload Pipeline (`POST /api/v1/uploads/photo`)**:
  - Decodes uploaded bytes via the `image` crate (`JPEG`, `PNG`, `WebP`), rejects malformed payloads, caps decoded dimensions (`4096px`), strips EXIF GPS/device metadata by re-encoding clean JPEG/PNG/WebP output, and serves `/uploads/*` with `X-Content-Type-Options: nosniff` and restrictive `Content-Security-Policy`.
- **Idempotent Collector Operations (`PATCH /api/v1/collector/tasks/:id/complete`, `POST /api/v1/collector/sync`)**:
  - Enforces an `idempotency-key` header and SHA-256 request fingerprint in `idempotency_keys` so flaky mobile retries on 3G/4G never double-record weights or completion states.

---

## 3. Web Frontend Architecture (`apps/web`)

Built with **Next.js 15 (App Router)**, **Strict TypeScript**, **Tailwind CSS v4**, and **Lucide Icons**:

- **Eco-Municipal Flat UI System:**
  - Page canvas: `#F8FAFC`, Card surface: `#FFFFFF`, Borders: `#E2E8F0` / `#CBD5E1`.
  - Deep Leaf Green accent: `#15803D` / `#14532D`, soft surface `#F0FDF4`.
  - Subtle elevation reserved for sticky header navigation and native `<dialog>` overlays.
- **Native Web Standards & Accessibility (WCAG AA):**
  - Native `<dialog class="cs-dialog" | "cs-drawer">` with `showModal()`, `@starting-style` transitions, and `overscroll-behavior: contain`.
  - Post-interaction form validation (`[data-touched='true']:user-invalid` + `aria-invalid`), single `one-time-code` OTP input with `autocomplete="one-time-code"` and WebOTP support, single `<div role="status" aria-live="polite">` announcer, and container-query responsive `.cs-table-wrapper` cards on narrow viewports.
  - Honest offline handling: public read routes display a clearly labeled offline preview mode when the Rust API is offline; write actions and uploads return explicit errors instead of faking success.

---

## 4. Mobile Performance & Offline Architecture (`apps/mobile`)

Designed for **2GB–3GB RAM Android devices** and intermittent mobile connectivity:

1. **Zero Blur / Elevation Overdraw:** Flat `1px` borders instead of `BackdropFilter` or blurred overlays.
2. **Pre-Upload Client Compression + Hardware Fallbacks:** Real `image_picker` (compressed to max `1280px`), `geolocator` GPS lookup, and `mobile_scanner` QR camera scanning paired with graceful manual code/coordinate fallbacks when permissions are unavailable.
3. **Persistent State & Offline Queue (`OfflineSyncStore`):** `SharedPreferences`-backed sync queue retries queued citizen submissions and idempotent collector task completions on reconnect without duplicating completed stops.
4. **Screen-Reader Semantics & Bilingual UX:** Bottom navigation uses crisp Bangla labels (`হোম`, `রিকোয়েস্ট`, `ম্যাপ`, `প্রোফাইল`), required field validation prevents silent `3.0 kg` defaults, and `Semantics` labels wrap icon-only controls and outdoor high-contrast duty toggles.
