# Clean Savar (ক্লিন সাভার) — Architecture Blueprint

## 1. System Overview

Clean Savar connects four user groups in Savar, Bangladesh through a single **Rust + PostGIS** core API:

1. **Citizens (নাগরিক):** Web portal (`/`, `/pickup`, `/report`, `/track`) and Flutter Citizen App (`apps/mobile_citizen`) to book household/bulk pickups and submit geo-tagged illegal dump photo reports.
2. **Municipality Dispatchers (সাভার পৌরসভা অপস):** Next.js Admin Dashboard (`/admin`) for spatial triage, ward queue filtering, and assigning the nearest rickshaw van or mini-truck.
3. **Field Collectors (সংগ্রহকারী):** Flutter Collector App (`apps/mobile_collector`) designed for low-end Android phones and outdoor sunlight legibility, supporting throttled GPS pings and proof-of-cleanup photos.
4. **Recycling Partners (পার্টনার পোর্টাল):** Next.js Partner Portal (`/partner`) for verified recyclables pickup lots and tonnage logs.

```text
+-----------------------+      +-------------------------+
| Next.js 15 Web App    |      | Flutter Mobile Apps     |
| - / (Citizen Portal)  |      | - mobile_citizen        |
| - /admin (Dispatch)   |      | - mobile_collector      |
| - /partner (Recycler) |      | (shared clean_savar_core|
+-----------+-----------+      +------------+------------+
            |                               |
            +---------------+---------------+
                            | HTTPS / JSON + Multipart
                            v
               +-------------------------+
               | Rust API (Axum + SQLx)  |
               | - Spatial Ward Lookup   |
               | - Pickup & Dump Triage  |
               | - Nearest Van Dispatch  |
               | - Media Upload Handler  |
               +------------+------------+
                            | SQLx + PostGIS
                            v
               +-------------------------+
               | PostgreSQL 16 + PostGIS |
               | - wards (MultiPolygon)  |
               | - pickup_requests (Pt)  |
               | - dump_reports (Pt)     |
               | - collector_vehicles    |
               | - status_events         |
               +-------------------------+
```

---

## 2. Geospatial Data Model (PostgreSQL + PostGIS)

All spatial geometries use **SRID 4326 (WGS 84)**:

- **`wards`**: Stores Savar Pourashava Wards 1–9 and priority peri-urban areas (e.g., Bank Town, Savar Bazar, CRP/Thana Stand, Radio Colony, Hemayetpur, Aminbazar, Ashulia) as `GEOMETRY(MultiPolygon, 4326)` with GIST indexing.
  - Auto-ward detection uses `ST_Contains(boundary, ST_SetSRID(ST_MakePoint($lng, $lat), 4326))`, falling back to nearest centroid (`boundary <-> point`) if a pin falls near a ward edge.
- **`pickup_requests`**: Household/commercial pickup orders (`CS-PK-XXXX`) with `waste_type`, `slot`, `location`, `ward_id`, and `status`.
- **`dump_reports`**: Citizen geo-tagged waste dump reports (`CS-DR-XXXX`) with `severity`, `photo_keys[]`, `resolved_photo_key`, `location`, and `status`.
  - Duplicate clustering & radius search use `ST_DWithin(location::geography, point::geography, radius_meters)`.
- **`collector_vehicles`**: Rickshaw vans (`rickshaw_van`), mini-trucks (`mini_truck`), and compactors (`compactor`) with live `current_location` (`Point, 4326`).
  - Dispatch recommendation queries `ST_Distance(v.current_location::geography, target::geography)` ordered ascending for available vehicles in or near the target ward.

---

## 3. Web Frontend Architecture (`apps/web`)

Built with **Next.js 15 (App Router)**, **Strict TypeScript**, **Tailwind CSS v4**, and **Lucide Icons**:

- **Anti-AI Flat UI System:**
  - Page canvas: `#F8FAFC` (`Slate-50`), Card surface: `#FFFFFF`, Borders: `1px solid #E2E8F0` (`Slate-200`).
  - Subtle `shadow-xs` reserved strictly for sticky header and native `<dialog>` modals.
  - Accent tokens: `#15803D` (primary CTA/active), `#14532D` (hover/deep accent), `#F0FDF4` (soft badge surface).
  - Status tokens: `#D97706` (Warning/Pending), `#DC2626` (Danger/Critical), `#0284C7` (Info/In Transit).
- **Bilingual Typography Pairing:**
  - `Hind Siliguri` (`line-height: 1.6`) for Bangla UI copy.
  - `Inter` (`font-variant-numeric: tabular-nums`) for English codes (`CS-PK-2041`), phone numbers (`01711-000000`), coordinates, and metrics.
  - `font-size-adjust: from-font` (with `@supports not (font-size-adjust: from-font)` fallback) keeps Bangla and inline English x-heights visually balanced.
- **Native Web Standards:**
  - Native `<dialog>` (`showModal()`) for confirmations and collector assignment modals with `overscroll-behavior: contain`.
  - Accessible forms (`:user-invalid`, `aria-invalid` synced post-interaction, hints placed above controls, minimum `48px` tap targets, `type="tel"` for Bangladeshi phone numbers).
  - Responsive `@container` tables that collapse gracefully to mobile summary cards on narrow viewports.

---

## 4. Mobile Performance Architecture (Flutter)

Designed specifically for **2GB–3GB RAM Android devices** and **unstable 3G/4G connections** in Savar:

1. **Zero Heavy Visual Effects:** `elevation: 0` across cards/appbars/bottom bars with crisp `1px #E2E8F0` borders—no `BackdropFilter`, no blur layers, no shadow overdraw.
2. **Pre-Upload Photo Compression:** Dump report photos are resized (max `1280px` edge) and compressed to ~70–75% JPEG before upload (`~180–350 KB` instead of `5–10 MB`).
3. **Offline-Resilient Submission Queue:** Citizens in weak-signal alleys can save a pickup request or photo report locally in `SharedPreferences`/local queue and auto-sync when connectivity returns.
4. **Low-Memory Lists & Const Trees:** All static widgets use `const` constructors, `ListView.separated` with explicit `cacheExtent`, and minimal widget rebuild scopes via granular Riverpod providers.
5. **Natural Bangla Microcopy:** Short 1–2 word bottom nav items (`হোম`, `পিকআপ`, `ছবি দিন`, `অবস্থা`) prevent text wrapping on `320dp–360dp` Android screens.
