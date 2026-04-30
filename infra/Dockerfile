# ── Stage 1: Build (Maven + Node inside Docker) ───────────────────────────────
FROM eclipse-temurin:21-jdk-jammy AS build

WORKDIR /workspace

# Install Node 20 for frontend-maven-plugin (alternative to the plugin's
# own download, which can be slow in CI without a cache volume).
RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends curl ca-certificates && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    rm -rf /var/lib/apt/lists/*

# Copy Maven wrapper first so dependency layer is cached separately.
COPY backend/.mvn        backend/.mvn
COPY backend/mvnw        backend/mvnw
COPY backend/pom.xml     backend/pom.xml

# Pre-fetch Maven dependencies (cache layer — only re-runs when pom.xml changes).
RUN cd backend && chmod +x mvnw && \
    ./mvnw dependency:go-offline -B -q

# Copy frontend manifest first (cache npm install layer).
COPY frontend/package.json     frontend/package.json
COPY frontend/package-lock.json frontend/package-lock.json

RUN cd frontend && npm ci --prefer-offline

# Copy rest of source.
COPY backend/src  backend/src
COPY frontend/src frontend/src
COPY frontend/index.html     frontend/index.html
COPY frontend/vite.config.ts frontend/vite.config.ts
COPY frontend/tsconfig*.json frontend/
COPY frontend/tailwind.config.js frontend/tailwind.config.js
COPY frontend/postcss.config.js  frontend/postcss.config.js

# Full production build — React → resources/static, then package JAR.
RUN cd backend && ./mvnw package -DskipTests -B -q

# ── Stage 2: Runtime (JRE only) ───────────────────────────────────────────────
FROM eclipse-temurin:21-jre-jammy AS runtime

WORKDIR /app

RUN groupadd --system appgroup && useradd --system --gid appgroup appuser
USER appuser

COPY --from=build /workspace/backend/target/login-app.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
