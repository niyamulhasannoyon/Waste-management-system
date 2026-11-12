# Contributing to Clean Savar (ক্লিন সাভার)

Thank you for helping improve municipal waste collection and civic reporting for Savar Pourashava and neighboring unions.

## Tooling Requirements

- **PostgreSQL 16 + PostGIS 3.4** (`docker compose up -d postgres`)
- **Rust** (`stable` toolchain via `rustup`, with `clippy` and `rustfmt`) for `apps/api`
- **Node.js `>= 22`** (pinned in `.nvmrc` and `apps/web/package.json` `engines`) for `apps/web`
- **Flutter SDK** (`Dart >= 3.5.0`) for `packages/clean_savar_core` and `apps/mobile`

## Development Workflow

1. Copy `.env.example` to `.env` and start PostGIS (`docker compose up -d postgres`) or the full stack (`docker compose up -d --build`).
2. Make focused, single-concern commits. Do not bundle unrelated refactoring or secret/env files.
3. Keep domain contracts aligned between [`apps/api/src/routes/mod.rs`](apps/api/src/routes/mod.rs), [`docs/openapi.yaml`](docs/openapi.yaml), [`apps/web/src/lib/`](apps/web/src/lib/types.ts), and [`packages/clean_savar_core/`](packages/clean_savar_core/lib/src/models/savar_models.dart).
4. Database schema changes must be additive SQL migrations under `apps/api/migrations/`.

## Verification Before Opening a PR

Run checks for every touched stack:

```bash
# Rust API
cd apps/api
cargo fmt --all -- --check
cargo clippy --all-targets -- -D warnings
cargo test

# Next.js Web (Node >= 22)
cd ../web
nvm use
npm run typecheck
npm run lint
npm test
npm run build

# Flutter / Dart
cd ../../packages/clean_savar_core && flutter pub get && flutter analyze
cd ../../apps/mobile && flutter pub get && flutter analyze && flutter test
```
