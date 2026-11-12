# Clean Savar Web Portal (`apps/web`)

Next.js 15 (App Router, Strict TypeScript, Tailwind CSS v4, Lucide Icons, Vitest) citizen and municipal operations portal for **Clean Savar (ক্লিন সাভার)**.

## Routes

- `/` — Public Citizen Portal, interactive Savar Ward `1–9` & Union `101–106` PostGIS map, live metrics, active hotspots, and Eco-Recycling overview
- `/login` — Phone OTP Sign-In with Bangladeshi number normalization and demo test account presets
- `/pickup` — Door-to-door one-time or recurring weekly (`recurring_weekly`) waste pickup scheduling with automatic ward detection
- `/report` — Geo-tagged illegal dump reporting with EXIF-stripped photo upload (up to 5 photos)
- `/track` — Real-time pickup (`CS-PK-*`) and report (`CS-DR-*`) status timeline lookup with optional phone verification
- `/collector` — Field Collector Workspace for assigned tasks, vehicle GPS pings, QR verification, and idempotent completion
- `/partner` — Verified Recycling Partner lot marketplace (`CS-LOT-*`) with filter & collection logging
- `/admin` — Savar Pourashava Dispatch & Analytics dashboard with PostGIS nearest-vehicle assignment, status triage, lot creation, and formula-injection-safe CSV export

## Design System & Accessibility

- **Eco-Municipal Flat UI:** Slate canvas (`#F8FAFC`), crisp card surfaces (`#FFFFFF`), high-contrast slate borders (`#E2E8F0` / `#CBD5E1`), Deep Leaf Green accent (`#15803D` / `#14532D`), zero glassmorphism or heavy elevation clutter.
- **Typography:** `Hind Siliguri` for Bangla prose (`line-height: 1.65`) paired with `Inter` (`font-variant-numeric: tabular-nums`) for codes, phone numbers, and metrics.
- **WCAG AA & Native Web Standards:** Semantic `<dialog>` modals and mobile drawers (`@starting-style`, `overscroll-behavior: contain`), post-interaction form validation (`aria-invalid` + `:user-invalid`), single `aria-live="polite"` status announcer, container-query responsive tables (`.cs-table-wrapper`), and `>= 44px` tap targets.

## Commands

Requires Node.js >= 22:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run dev
```

Configure the Rust API URL via `.env.local` (or root `.env`):

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

When `NEXT_PUBLIC_API_URL` is unreachable, public read views enter a clearly badged offline preview mode; mutating actions (`POST`/`PATCH`, OTP verification, photo uploads) require the live backend API and never fabricate successful writes.
