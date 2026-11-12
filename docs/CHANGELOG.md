# Changelog

Notable audit remediations and platform updates for **Clean Savar (ক্লিন সাভার)** are documented here.

## Unreleased (Phase 3 Remediation Series)

### Security, Auth & RBAC (`apps/api`, `apps/web`, `apps/mobile`)
- **API RBAC & Privilege Escalation Hardening (`a5fab22`)**: Removed public OTP `collector` self-registration and fallback role elevation; scoped collector `GET /pickups`, `GET /reports`, and `GET /dispatch/vehicles` to assigned/own-ward unassigned vehicles only; enforced non-null `vehicle_id`/`partner_id` checks on collector completion and partner lot collection; restricted `/workers/nearby` to `admin`.
- **Config, Proxy, Upload & Tracking Hardening (`9baf465`)**: Added `APP_ENV=production` fail-closed guard refusing `OTP_DEV_MODE=true` or `ALLOW_INSECURE_DEV_DEFAULTS=true`; cleared default `ADMIN_BOOTSTRAP_PHONES`; added `TRUSTED_PROXY_IPS` resolution middleware so raw `X-Forwarded-For` headers cannot spoof rate limits; bounded image header dimensions before decoding (`<= 8000x8000`, `128 MiB`); masked PII in logs/error responses; rate-limited and redacted unauthenticated `/track/:code` responses; switched `/analytics` date boundary to `Asia/Dhaka`; added ETag `304` handling on `/wards`.
- **Web Portal & Notification Sync (`9ffbe36`)**: Returned updated notification JSON from `PATCH /notifications/:id/read`; removed `svg+xml` from safe image URIs; gated demo OTP quick-fill accounts behind `NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS`; removed collector self-registration radio option; added canvas JPEG compression (`> 350 KB` -> max `1400px`); added `X-Frame-Options`, `nosniff`, `Referrer-Policy`, and `Permissions-Policy` headers; upgraded SVG map keyboard focus/ARIA semantics and `44px` tap targets.
- **Mobile & Shared Dart Core (`cb6472b`)**: Gated Collector mode switching and OTP dev preview behind `kDebugMode` / server role; called `POST /auth/logout` on sign-out; forwarded `schedule_type`, `preferred_day`, and `notes` on pickup booking & offline sync; removed hardcoded `pendingSyncCount: 3` fake badge and required actual queue flush success; required matching bin tag entry in `qr_scan_sheet`; widened Savar map bounds to cover unions `101–106` with `48dp` targets; rendered `photoUrls` on hotspot cards; fixed horizontal eco-guide card overflow under text scaling.

### Database, Privacy, Observability & Ops
- **PostGIS Indexes, Audit Trail, Retention & Demo Controls (`0ef1707`)**: Added `apps/api/migrations/0003_indexes_audit_retention.sql` (`::geography` GIST indexes, `pg_trgm` GIN indexes, `audit_logs`, `anonymized_at`/`retention_until`/`is_demo`, and `purge_expired_pii()`), `POST /api/v1/auth/erase`, `POST /api/v1/admin/retention/purge`, `PaginationQuery` on `/notifications`, and `apps/api/scripts/purge_demo_seed.sql`.
- **Constant-Time Compare, JSON Logs & Runtime OpenAPI (`02e57c4`)**: Switched OTP digest comparison to `subtle::ConstantTimeEq`, added `LOG_FORMAT=json` structured `tracing-subscriber` logs (defaulting to JSON in `APP_ENV=production`), and added `utoipa` schema derivations serving `GET /api/v1/openapi.json`.
- **Integration Suite, Backups & Security CI**: Refactored `build_router` into `apps/api/src/lib.rs`, added end-to-end PostGIS API tests in `apps/api/tests/api_integration.rs`, added `scripts/backup_postgis.sh`, and added `security-scans` (`gitleaks`, `cargo audit`, `npm audit`) to `.github/workflows/ci.yml`.

### DevOps & Documentation
- Added `.nvmrc` pinning Node `22` alongside `engines` in `apps/web/package.json`.
- Added multi-stage standalone `apps/web/Dockerfile` and expanded `docker-compose.yml` to run `postgres` + `api` + `web` with persistent `uploads_data` storage and health checks.
- Moved UI audit comparison tables out of `README.md` into this changelog and added `SECURITY.md`, `CONTRIBUTING.md`, `docs/API.md`, and `docs/openapi.yaml`.

---

## Historical Web UI Redesign (Before vs After Summary)

| Area | Before Audit State | After Redesign |
| --- | --- | --- |
| **Header & Navigation** | Dual unaligned nav bars / crowded action clutter | Unified sticky navbar (`<= 68px`), single mobile `<dialog>` drawer, notification badge, OTP session pill |
| **Auth & Protected Portals** | Unauthenticated role switches / direct demo impersonation | Server-enforced Phone OTP modal/page (`/login`) with Bangladeshi phone normalization, WebOTP support, and role-gated access (`/collector`, `/partner`, `/admin`) |
| **Typography & Theme** | Inconsistent contrast & mixed legacy tokens | Eco-Municipal flat tokens (`#F8FAFC` / `#FFFFFF` / `#E2E8F0` / `#15803D`), WCAG AA contrast, balanced `Hind Siliguri` + tabular `Inter` numerals |
| **Coverage & Forms** | Partial Savar ward data & eager red validation | Canonical Savar Wards `1–9` + Unions `101–106`, post-interaction validation, accessible native `<dialog>`, zero mobile horizontal overflow (`scrollWidth <= innerWidth` verified at `390px`) |
| **Tracking & Offline** | Silent mock fallbacks pretending writes succeeded | Clear offline preview notice on public reads; real errors surfaced on mutating routes without faking persistence |
