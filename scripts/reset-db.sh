#!/usr/bin/env bash
# reset-db.sh — Drop and recreate the app_user table, then seed.
#
# WARNING: This destroys all data in app_user. Dev/local only.
#
# Usage:
#   source .env && ./scripts/reset-db.sh

set -euo pipefail

: "${DATABASE_URL:?Set DATABASE_URL before running reset-db.sh}"
: "${DATABASE_USERNAME:?Set DATABASE_USERNAME before running reset-db.sh}"
: "${DATABASE_PASSWORD:?Set DATABASE_PASSWORD before running reset-db.sh}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "⚠️  This will DROP and recreate app_user. Ctrl+C within 5s to cancel."
sleep 5

PGPASSWORD="$DATABASE_PASSWORD" psql "$DATABASE_URL" -U "$DATABASE_USERNAME" <<'SQL'
DROP TABLE IF EXISTS app_user CASCADE;
SQL

echo "Running Flyway migration V1__init.sql..."
PGPASSWORD="$DATABASE_PASSWORD" psql "$DATABASE_URL" -U "$DATABASE_USERNAME" \
  -f "$ROOT/supabase/migrations/V1__init.sql"

echo "Applying seed data..."
PGPASSWORD="$DATABASE_PASSWORD" psql "$DATABASE_URL" -U "$DATABASE_USERNAME" \
  -f "$ROOT/supabase/seed/seed.sql"

echo "✓ Database reset and seeded."
echo "  Test accounts (password: password123):"
echo "    alice@example.com"
echo "    bob@example.com"
