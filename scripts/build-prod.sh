#!/usr/bin/env bash
# build-prod.sh — Produce the production-style single JAR.
#
# Usage:
#   ./scripts/build-prod.sh
#
# Output: backend/target/login-app.jar
# The jar contains Spring Boot + the complete React build.
# Run it with:
#   DATABASE_URL=... DATABASE_USERNAME=... DATABASE_PASSWORD=... \
#   java -jar backend/target/login-app.jar

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/backend"

echo "Building production JAR..."
./mvnw clean package -B

JAR="$ROOT/backend/target/login-app.jar"
SIZE=$(du -sh "$JAR" | cut -f1)
echo ""
echo "✓ Build complete: $JAR ($SIZE)"
echo ""
echo "Run it:"
echo "  DATABASE_URL='jdbc:postgresql://...' \\"
echo "  DATABASE_USERNAME='postgres.<ref>' \\"
echo "  DATABASE_PASSWORD='<password>' \\"
echo "  java -jar backend/target/login-app.jar"
