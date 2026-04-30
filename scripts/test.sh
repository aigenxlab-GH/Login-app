#!/usr/bin/env bash
# test.sh — Run all backend integration tests.
#
# No Supabase credentials required: tests use H2 in-memory via
# the "test" Spring profile (application-test.yml).
#
# Usage:
#   ./scripts/test.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/backend"

echo "Running backend tests..."
./mvnw test -B

echo ""
echo "✓ All tests passed."
