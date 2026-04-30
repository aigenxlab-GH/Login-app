#!/usr/bin/env bash
# dev.sh — Start both backend and frontend in dev mode.
#
# Usage:
#   source .env && ./scripts/dev.sh
#
# Requires: Java 21, Node 20, npm
# The backend must be able to reach Supabase Postgres.
# Set DATABASE_URL, DATABASE_USERNAME, DATABASE_PASSWORD before running.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Validate required env vars.
: "${DATABASE_URL:?Set DATABASE_URL before running dev.sh}"
: "${DATABASE_USERNAME:?Set DATABASE_USERNAME before running dev.sh}"
: "${DATABASE_PASSWORD:?Set DATABASE_PASSWORD before running dev.sh}"

cleanup() {
  echo ""
  echo "Stopping dev servers..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "── Starting Spring Boot on :8080 ──────────────────────────────"
cd "$ROOT/backend"
./mvnw spring-boot:run \
  -Dspring-boot.run.jvmArguments="-DDATABASE_URL=$DATABASE_URL -DDATABASE_USERNAME=$DATABASE_USERNAME -DDATABASE_PASSWORD=$DATABASE_PASSWORD" \
  &
BACKEND_PID=$!

echo "── Starting Vite dev server on :5173 ──────────────────────────"
cd "$ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "Dev servers running:"
echo "  Frontend (Vite) : http://localhost:5173"
echo "  Backend (Spring): http://localhost:8080"
echo ""
echo "Press Ctrl+C to stop both."

wait
