# Clean Savar (ক্লিন সাভার)

Smart waste management ecosystem for **Savar Pourashava (সাভার পৌরসভা) & surrounding unions**, built for raw performance, high accessibility, and everyday Bangladeshi Bangla usability.

## Monorepo Layout

```text
.
├── apps/
│   ├── api/                 # Rust (Axum + SQLx) REST & Geospatial API (PostgreSQL + PostGIS)
│   ├── web/                 # Next.js 15 (App Router, Strict TS, Tailwind, shadcn/ui, Lucide)
│   │                        #   - /         Public Citizen Portal
│   │                        #   - /pickup   On-Demand Pickup Request
│   │                        #   - /report   Geo-Tagged Dump Photo Report
│   │                        #   - /track    Live Request & Report Tracker
│   │                        #   - /admin    Municipality Dispatch Dashboard
│   │                        #   - /partner  Recycler & Partner Portal
│   ├── mobile_citizen/      # Flutter (Dart 3+, Riverpod, GoRouter, Material 3) Citizen App
│   └── mobile_collector/    # Flutter (Dart 3+, Riverpod, GoRouter, Material 3) Collector App
├── packages/
│   └── clean_savar_core/    # Shared Flutter/Dart theme, models, Savar wards, API client
├── docs/
│   └── ARCHITECTURE.md      # Full-stack blueprint, PostGIS schema & mobile optimization notes
├── docker-compose.yml       # PostgreSQL 16 + PostGIS 3.4 + local storage volumes
└── .env.example             # Environment configuration template
```

## Quick Start

### 1. Database (PostgreSQL 16 + PostGIS)

```bash
cp .env.example .env
docker compose up -d postgres
```

Migrations live in [`apps/api/migrations/`](apps/api/migrations/0001_init_postgis.sql) and are automatically applied by SQLx on API startup (or manually via `psql`).

### 2. Backend API (Rust Axum + SQLx)

Requires Rust toolchain (`rustup` / `cargo`) and PostgreSQL + PostGIS running:

```bash
cd apps/api
cargo run
```

The API listens on `http://127.0.0.1:8080` (`GET /api/v1/health`).

### 3. Web Platform (Next.js 15)

Requires Node.js >= 20/22:

```bash
cd apps/web
npm install
npm run dev
```

Open `http://localhost:3000`. If the Rust API is not running locally, the web app runs in a clearly labeled **local preview mode** backed by Savar ward seed data and browser `localStorage`, and automatically switches to live API calls when `NEXT_PUBLIC_API_URL` responds.

### 4. Mobile Apps (Flutter)

Requires Flutter SDK (Dart 3.5+):

```bash
cd apps/mobile_citizen
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8080/api/v1
```

For the collector app:

```bash
cd apps/mobile_collector
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8080/api/v1
```

## Core Architecture & Design Principles

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for:
- PostGIS spatial ward detection (`ST_Contains`) and nearest-collector dispatch (`ST_Distance`)
- Strict Anti-AI Flat Design System (`#F8FAFC` / `#FFFFFF` / `#E2E8F0`, `#15803D` primary)
- Mixed Bangla (`Hind Siliguri`, `line-height: 1.6`) + English/Metrics (`Inter`) typography
- Low-end Android optimizations for Flutter (2GB RAM devices, compressed JPEG uploads, offline queue)
