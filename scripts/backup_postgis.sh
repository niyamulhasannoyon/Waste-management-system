#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Clean Savar — PostGIS Database Backup Script

Creates a compressed PostgreSQL custom-format dump (.dump), writes a SHA-256
checksum sidecar (.dump.sha256), and prunes backups older than retention days.

Environment variables:
  DATABASE_URL           Full libpq connection URI (recommended)
  PGHOST/PGPORT/PGUSER/  Alternative libpq connection variables if DATABASE_URL is unset
  PGDATABASE/PGPASSWORD
  BACKUP_DIR             Output directory (default: ./backups)
  BACKUP_RETENTION_DAYS  Days before pruning old .dump files (default: 14)

Example restore command:
  sha256sum -c backups/clean_savar_YYYYMMDDTHHMMSSZ.dump.sha256
  pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" backups/clean_savar_YYYYMMDDTHHMMSSZ.dump
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "Error: pg_dump is not installed or not on PATH." >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
if ! [[ "$RETENTION_DAYS" =~ ^[0-9]+$ ]]; then
  echo "Error: BACKUP_RETENTION_DAYS must be a non-negative integer." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_FILE="${BACKUP_DIR%/}/clean_savar_${TIMESTAMP}.dump"

if [[ -n "${DATABASE_URL:-}" ]]; then
  pg_dump --format=custom --no-owner --no-privileges --file="$OUT_FILE" "$DATABASE_URL"
elif [[ -n "${PGDATABASE:-}" ]]; then
  pg_dump --format=custom --no-owner --no-privileges --file="$OUT_FILE"
else
  echo "Error: Set DATABASE_URL (or PGDATABASE/PGUSER/PGHOST) before running backup." >&2
  exit 1
fi

if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$OUT_FILE" > "${OUT_FILE}.sha256"
elif command -v shasum >/dev/null 2>&1; then
  shasum -a 256 "$OUT_FILE" > "${OUT_FILE}.sha256"
else
  echo "Warning: neither sha256sum nor shasum found; skipping .sha256 checksum." >&2
fi

find "$BACKUP_DIR" -maxdepth 1 -type f \( -name 'clean_savar_*.dump' -o -name 'clean_savar_*.dump.sha256' \) \
  -mtime "+${RETENTION_DAYS}" -delete

echo "Backup written to: $OUT_FILE"
