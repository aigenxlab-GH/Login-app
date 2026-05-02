# =============================================================================
# Login App — production-style Dockerfile
#
# Multi-stage build:
#   STAGE 1 (builder)  Java 21 JDK + Node 20  →  fat JAR with the React SPA bundled in
#   STAGE 2 (runtime)  Java 21 JRE only       →  minimal image that just runs the JAR
#
# Used by Railway, Render, Fly.io, GoDaddy VPS, or any container platform.
# Local test:  docker build -t login-app . && docker run -p 8085:8085 login-app
# =============================================================================

# ── STAGE 1 — build ──────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jdk AS builder

# Install Node 20 LTS — frontend-maven-plugin uses the system node/npm
# (pom.xml does not specify <installDirectory>).
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates \
 && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Layer 1: Maven wrapper + pom.xml — cached as long as deps don't change.
COPY backend/.mvn/                 ./backend/.mvn/
COPY backend/mvnw                  ./backend/mvnw
COPY backend/mvnw.cmd              ./backend/mvnw.cmd
COPY backend/pom.xml               ./backend/pom.xml
RUN chmod +x ./backend/mvnw \
 && cd backend \
 && ./mvnw -B -q dependency:go-offline -DskipTests || true

# Layer 2: package.json — cached as long as npm deps don't change.
COPY frontend/package*.json        ./frontend/
RUN cd frontend && npm ci --no-audit --no-fund

# Layer 3: actual source.
COPY frontend                      ./frontend
COPY backend                       ./backend

# Build the fat JAR. Tests are skipped here because the JVM wouldn't have a
# database to connect to during image build — run `mvnw test` in CI instead.
RUN cd backend && ./mvnw -B clean package -DskipTests

# ── STAGE 2 — runtime ────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre

# Run as a non-root user (security best practice).
RUN groupadd --system app && useradd --system --gid app --home /app app
WORKDIR /app

COPY --from=builder /build/backend/target/login-app.jar /app/login-app.jar
RUN chown app:app /app/login-app.jar
USER app

# Documentation only — Railway sets $PORT and the JAR honors it via
# server.port: ${PORT:8085} in application.yml.
EXPOSE 8085

# -Xmx400m fits comfortably in Railway's free-tier RAM.
# Argon2id uses 64 MB per hash, so 400 MB heap leaves plenty of headroom.
ENTRYPOINT ["java", "-Xmx400m", "-XX:+ExitOnOutOfMemoryError", "-jar", "/app/login-app.jar"]
