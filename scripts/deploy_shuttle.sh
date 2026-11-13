#!/usr/bin/env bash
set -euo pipefail

# Clean Savar — Shuttle Deployment Automation Script
# Usage: ./scripts/deploy_shuttle.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="${ROOT_DIR}/apps/api"

echo "=================================================="
echo " 🚀 Clean Savar — Shuttle Backend Deployer"
echo "=================================================="

# 1. Check Shuttle CLI
if ! command -v shuttle &> /dev/null && ! command -v cargo-shuttle &> /dev/null; then
  echo "⚠️  Shuttle CLI is not found in PATH."
  echo "👉 Installing pre-built Shuttle CLI binary..."
  curl -sSfL https://www.shuttle.dev/install | bash
  export PATH="${HOME}/.cargo/bin:${PATH}"
fi

SHUTTLE_BIN="$(command -v shuttle || command -v cargo-shuttle)"
echo "✅ Shuttle CLI binary: ${SHUTTLE_BIN} ($(${SHUTTLE_BIN} --version))"

# 2. Check Shuttle.toml & Secrets.toml
if [ ! -f "${API_DIR}/Shuttle.toml" ]; then
  echo "📝 Creating apps/api/Shuttle.toml..."
  cat << 'EOF' > "${API_DIR}/Shuttle.toml"
name = "clean-savar"
EOF
fi

if [ ! -f "${API_DIR}/Secrets.toml" ]; then
  if [ -f "${ROOT_DIR}/Secrets.toml" ]; then
    echo "📋 Copying root Secrets.toml to apps/api/Secrets.toml..."
    cp "${ROOT_DIR}/Secrets.toml" "${API_DIR}/Secrets.toml"
  else
    echo "❌ apps/api/Secrets.toml not found! Please create it from Secrets.example.toml before deploying."
    exit 1
  fi
fi

# 3. Check login status
echo "🔍 Checking Shuttle account status..."
if ! ${SHUTTLE_BIN} account > /dev/null 2>&1; then
  echo "⚠️  Not logged in to Shuttle."
  echo "👉 Run: shuttle login (or shuttle login --api-key <YOUR_KEY>)"
  echo "   You can generate an API key from https://console.shuttle.dev"
  echo "   Then re-run this script."
  exit 1
fi

# 4. Deploy from apps/api
echo "📦 Initiating Shuttle deployment for Clean Savar API..."
cd "${API_DIR}"
${SHUTTLE_BIN} deploy --allow-dirty

echo "=================================================="
echo " 🎉 Shuttle deployment initiated successfully!"
echo " Live API Domain: https://clean-savar.shuttle.app"
echo " Web Portal: https://clean-savar.vercel.app"
echo "=================================================="
