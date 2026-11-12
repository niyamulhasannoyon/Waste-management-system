# Clean Savar (ক্লিন সাভার) — Smart Municipal Waste Management System

**Clean Savar** is a full-stack municipal waste management platform built for **Savar Pourashava (সাভার পৌরসভা, Wards 1–9)** and **6 surrounding unions (101–106)**. It unifies a hardened **Rust + PostGIS** geospatial backend (`apps/api`), an accessible **Next.js 15** portal (`apps/web`), and an offline-capable **Flutter** mobile app (`apps/mobile` + `packages/clean_savar_core`).

---

## Features by Role

- **Citizens (নাগরিক):**
  - Schedule one-time or recurring weekly (`recurring_weekly`) door-to-door pickups (`/pickup`)
  - Report illegal dumping with EXIF-stripped photos & automatic PostGIS ward/union resolution (`/report`)
  - Track live complaint & pickup milestones by tracking code (`CS-PK-*` / `CS-DR-*`) with optional phone verification (`/track`)
  - Interactive Savar Ward `1–9` & Union `101–106` hotspot map (`/`)
- **Field Collectors (সংগ্রহকারী):**
  - Dedicated web workspace (`/collector`) and outdoor high-contrast Flutter Collector Mode
  - QR bin verification, required numeric weight logging, live vehicle GPS pings, and SHA-256 idempotent task completion / offline batch sync
- **Recycling Partners (পার্টনার পোর্টাল):**
  - Browse, filter, claim, and record collection of verified municipal recyclable lots (`CS-LOT-*`) (`/partner`)
- **Municipal Administrators (পৌর অ্যাডমিন):**
  - PostGIS nearest-vehicle dispatch & triage queue (`/admin`), status notifications, recyclable lot creation, and formula-injection-safe CSV export
- **Platform Security & Integrity:**
  - HMAC-SHA256 Phone OTP authentication with Bearer token sessions & RBAC (`citizen`, `collector`, `partner`, `admin`)
  - `50m` PostGIS spatial duplicate detection (`ST_DWithin`) on illegal dump complaints
  - Magic-byte verification + EXIF stripping (`image` crate) on all uploaded photos

---

## Web UI Redesign (Before vs After Summary)

| Area | Before Audit State | After Phase 3 Redesign |
| --- | --- | --- |
| **Header & Navigation** | Dual unaligned nav bars / crowded action clutter | Unified sticky navbar (`<= 68px`), single mobile `<dialog>` drawer, notification badge, OTP session pill |
| **Auth & Protected Portals** | Unauthenticated role switches / direct demo impersonation | Server-enforced Phone OTP modal/page (`/login`) with Bangladeshi phone normalization, WebOTP support, and role-gated access (`/collector`, `/partner`, `/admin`) |
| **Typography & Theme** | Inconsistent contrast & mixed legacy tokens | Eco-Municipal flat tokens (`#F8FAFC` / `#FFFFFF` / `#E2E8F0` / `#15803D`), WCAG AA contrast, balanced `Hind Siliguri` + tabular `Inter` numerals |
| **Coverage & Forms** | Partial Savar ward data & eager red validation | Canonical Savar Wards `1–9` + Unions `101–106`, post-interaction validation, accessible native `<dialog>`, zero mobile horizontal overflow (`scrollWidth <= innerWidth` verified at `390px`) |
| **Tracking & Offline** | Silent mock fallbacks pretending writes succeeded | Clear offline preview notice on public reads; real errors surfaced on mutating routes without faking persistence |

---

## Tech Stack

| Layer | Technologies |
| --- | --- |
| **Backend API** | Rust (2021), Axum 0.7, SQLx 0.8, Tokio, `tower-http`, `hmac`/`sha2`, `image` 0.25 |
| **Database & GIS** | PostgreSQL 16 + PostGIS 3.4 (SRID 4326 `MultiPolygon`/`Point`, GIST indexes) |
| **Web Portal** | Next.js 15 (App Router), React 19, TypeScript (strict), Tailwind CSS v4, Lucide Icons, Vitest + Testing Library |
| **Mobile App** | Flutter SDK (Dart `>=3.5.0`), Riverpod, `geolocator`, `image_picker`, `mobile_scanner`, `shared_preferences` |
| **CI/CD & Containers** | Docker Compose (`postgis/postgis:16-3.4-alpine`), GitHub Actions (`.github/workflows/ci.yml`) |

---

## Project Structure

```text
.
├── .github/workflows/ci.yml        # CI pipeline (Rust/PostGIS, Next.js Web, Flutter Mobile)
├── .env.example                    # Environment configuration template
├── docker-compose.yml              # Local PostgreSQL 16 + PostGIS 3.4 container
├── LICENSE                         # MIT License
├── docs/ARCHITECTURE.md            # Detailed geospatial, security & UI architecture
├── apps/
│   ├── api/                        # Unified Rust Axum + SQLx PostGIS REST API
│   │   ├── migrations/             # 0001_init_postgis.sql, 0002_seed_savar_wards.sql
│   │   └── src/                    # auth, config, db, error, models, routes/
│   ├── web/                        # Next.js 15 Citizen, Collector, Partner & Admin Web Portal
│   │   ├── src/app/                # /, /login, /pickup, /report, /track, /collector, /partner, /admin
│   │   ├── src/components/         # Reusable design system & portal modules
│   │   └── src/__tests__/          # Vitest unit, API client & component suites
│   └── mobile/                     # Unified Flutter Citizen & Collector App
│       ├── lib/                    # Riverpod providers, offline sync queue, Citizen & Collector UI
│       └── test/widget_test.dart   # Flutter widget & offline/OTP flow tests
└── packages/
    └── clean_savar_core/           # Shared Dart models, Savar wards (1-9, 101-106), API client
```

---

## Environment Variables

Copy `.env.example` to `.env` before running the backend or web app (`AUTH_SECRET` must be set cleanly in production):

| Variable | Description | Example / Default |
| --- | --- | --- |
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | PostgreSQL container credentials | `clean_savar` |
| `DATABASE_URL` | PostgreSQL + PostGIS connection URI | `postgres://clean_savar:...@localhost:5432/clean_savar` |
| `AUTH_SECRET` | `>=32`-byte HMAC secret for OTP & Bearer token hashing (`openssl rand -hex 32`) | *(required unless `ALLOW_INSECURE_DEV_DEFAULTS=true`)* |
| `OTP_DEV_MODE` | Returns `otp_preview` in challenge response for local dev only | `false` |
| `ADMIN_BOOTSTRAP_PHONES` | Comma-separated phone numbers granted `admin` role via OTP | `01711-240100` |
| `API_BIND_ADDR` | Rust Axum bind address | `0.0.0.0:8080` |
| `CORS_ALLOWED_ORIGINS` | Allowed browser origins for CORS | `http://localhost:3000,http://127.0.0.1:3000` |
| `UPLOAD_DIR` / `PUBLIC_UPLOAD_BASE_URL` / `MAX_UPLOAD_BYTES` | Local upload storage path, public base URL, and max image size | `./uploads`, `http://localhost:8080/uploads`, `5242880` |
| `NEXT_PUBLIC_API_URL` | API base URL used by `apps/web` | `http://localhost:8080/api/v1` |

---

## Local Setup & Verification

### 1. Start PostgreSQL 16 + PostGIS

```bash
cp .env.example .env
# Set a local POSTGRES_PASSWORD and AUTH_SECRET (e.g. openssl rand -hex 32)
docker compose up -d postgres
```

SQL migrations in [`apps/api/migrations/`](apps/api/migrations/0001_init_postgis.sql) are applied automatically by Docker entrypoint initialization and SQLx on API startup.

### 2. Run Unified Rust API (`apps/api`)

Requires Rust (`stable` toolchain via `rustup`) and PostGIS reachable on `DATABASE_URL`:

```bash
cd apps/api
cargo run
```

Verify health on `http://127.0.0.1:8080/api/v1/health`. Run backend checks:

```bash
cargo fmt --all -- --check
cargo clippy --all-targets -- -D warnings
cargo test
```

### 3. Run Next.js Web Portal (`apps/web`)

Requires Node.js >= 22:

```bash
cd apps/web
npm ci
npm run dev
```

Verify quality gates:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

> **Preview behavior:** When `apps/api` is unreachable, public read views load Clean Savar sample data in an explicit offline preview banner; authenticated routes (`/collector`, `/partner`, `/admin`), OTP sign-in, photo uploads, and form submissions require the live Rust API.

### 4. Run Unified Flutter Mobile App (`apps/mobile`)

Requires Flutter SDK (Dart `>=3.5.0`):

```bash
cd packages/clean_savar_core && flutter pub get && flutter analyze
cd ../../apps/mobile && flutter pub get && flutter analyze && flutter test
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8080/api/v1
```

Seeded Savar test accounts (all log in via real Phone OTP when `OTP_DEV_MODE=true` in development):
- Citizen: `01715-883210`
- Collector (`SV-VAN-01`): `01712-448910`
- Recycling Partner: `01755-880001`
- Municipal Admin: `01711-240100`

---

## Contributing

1. Fork or branch from `main` in small, focused commits.
2. Keep database migrations additive inside `apps/api/migrations/` and mirror shared domain contracts across `apps/web/src/lib/` and `packages/clean_savar_core/`.
3. Run the relevant checks (`cargo clippy`/`cargo test`, `npm run typecheck && npm run lint && npm test && npm run build`, `flutter analyze && flutter test`) before opening a PR.

## License

Licensed under the [MIT License](LICENSE).
