#!/usr/bin/env bash
# run-prod.sh — Run the production JAR locally.
#
# Requires the jar to already be built:
#   ./scripts/build-prod.sh
#
# Usage:
#   source .env && ./scripts/run-prod.sh
#
# Then open http://localhost:${PORT:-8080}

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

: "${DATABASE_URL:?Set DATABASE_URL before running run-prod.sh}"
: "${DATABASE_USERNAME:?Set DATABASE_USERNAME before running run-prod.sh}"
: "${DATABASE_PASSWORD:?Set DATABASE_PASSWORD before running run-prod.sh}"

JAR="$ROOT/backend/target/login-app.jar"

if [ ! -f "$JAR" ]; then
  echo "JAR not found. Run ./scripts/build-prod.sh first."
  exit 1
fi

PORT="${PORT:-8080}"

echo "Starting production JAR on :$PORT ..."
echo "  UI  → http://localhost:$PORT"
echo "  API → http://localhost:$PORT/api/**"
echo ""

exec java -jar "$JAR"
