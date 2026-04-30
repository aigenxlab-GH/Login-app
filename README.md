# Login App

A production-grade, **single-JAR** web application with a 4-page authentication
flow. One executable JAR serves the Spring Boot REST API and the React UI.

---

## Stack

| Layer | Technology |
|---|---|
| Backend | Spring Boot 3.3.x · Java 21 · Maven |
| Security | Spring Security 6 · BCrypt · server-side HttpSession |
| Database | Supabase Postgres (JDBC + Flyway) |
| Frontend | React 18 · Vite 5 · TypeScript · Tailwind CSS 3 |
| Routing | react-router-dom v6 |

---

## Production-Style Architecture

```
┌────────────────── login-app.jar (single deployable) ──────────────────┐
│                                                                        │
│  Spring Boot                                                           │
│  ├── /api/**       REST controllers (auth, users)                      │
│  └── /**           Static handler → React SPA (index.html + assets)   │
│                    SpaForwardingConfig → forward:/index.html           │
│                    for unmatched paths (enables React Router refresh)  │
└────────────────────────────────────────────────────────────────────────┘
```

**Build pipeline** (`./mvnw clean package` inside `backend/`):

1. `frontend-maven-plugin` installs Node 20 LTS locally, runs `npm ci` then
   `npm run build`.
2. Vite writes its output to `backend/src/main/resources/static/`.
3. Maven packages everything into `backend/target/login-app.jar`.
4. `java -jar backend/target/login-app.jar` serves UI at `/` and API at
   `/api/**` — same origin, no CORS.

**Frontend API calls**: always relative `/api/...` paths — never a hardcoded
hostname. Vite's dev-mode proxy handles the difference transparently.

---

## Repository Layout

```
login-app/
├── backend/                  Spring Boot (Java 21, Maven)
│   ├── pom.xml               Includes frontend-maven-plugin
│   ├── mvnw / mvnw.cmd       Maven wrapper (no local Maven needed)
│   └── src/
│       ├── main/java/        Application code
│       ├── main/resources/
│       │   ├── application.yml
│       │   ├── db/migration/ Flyway SQL migrations
│       │   └── static/       ← Vite build output (gitignored)
│       └── test/             @SpringBootTest + H2 integration tests
├── frontend/                 React + Vite + TypeScript + Tailwind
│   ├── src/
│   │   ├── pages/            LoginPage, HomePage, SignupPage, ChangePasswordPage
│   │   ├── components/       ProtectedRoute, Banner
│   │   └── api/client.ts     Fetch wrapper (relative /api paths only)
│   └── vite.config.ts        outDir → ../backend/src/main/resources/static
├── supabase/
│   ├── migrations/           Mirror of Flyway SQL (for Supabase CLI)
│   └── seed/                 Local dev seed data
├── infra/                    Docker Compose, deployment notes
├── docs/                     Architecture decisions
├── scripts/                  Helper shell scripts
├── .github/workflows/        CI (build + test)
├── CLAUDE.md                 Project conventions (read before touching code)
├── .env.example              All required env vars with placeholders
└── .editorconfig
```

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Java | 21 | `java --version` |
| Node.js | 20 LTS | Only needed for `npm run dev`. Maven wrapper installs Node locally for builds. |
| npm | 10+ | Comes with Node 20 |
| Maven | any | Optional — `mvnw` wrapper included |

---

## Environment Setup

Copy `.env.example` and fill in your Supabase connection details:

```bash
cp .env.example .env   # never commit .env
```

Get the JDBC URL from: **Supabase Dashboard → Project → Settings → Database →
Connection string → URI tab → JDBC format**.

The minimum required env vars:

```
DATABASE_URL=jdbc:postgresql://<host>:<port>/<db>?sslmode=require
DATABASE_USERNAME=postgres.<project-ref>
DATABASE_PASSWORD=<your-db-password>
```

---

## Database Setup (first time)

Flyway runs automatically on startup. It applies
`backend/src/main/resources/db/migration/V1__init.sql` which creates the
`app_user` table.

If you are using the Supabase CLI:

```bash
cd supabase
supabase db push   # applies migrations in supabase/migrations/
```

---

## Local Dev Mode

Two terminals — hot reload on both sides:

```bash
# Terminal 1 — Spring Boot on :8080
cd backend
./mvnw spring-boot:run \
  -Dspring-boot.run.jvmArguments="-DDATABASE_URL=jdbc:postgresql://... -DDATABASE_USERNAME=... -DDATABASE_PASSWORD=..."

# Terminal 2 — Vite dev server on :5173 (proxies /api/** → :8080)
cd frontend
npm install          # first time only
npm run dev
```

Open **http://localhost:5173**.

On Windows (PowerShell) set env vars before the Spring Boot command:

```powershell
$env:DATABASE_URL      = 'jdbc:postgresql://...'
$env:DATABASE_USERNAME = 'postgres.<ref>'
$env:DATABASE_PASSWORD = '<password>'
cd backend
.\mvnw.cmd spring-boot:run
```

---

## Prod-Mode Local Test

The canonical way to verify the production-style single-JAR build locally:

```bash
# PowerShell
$env:DATABASE_URL      = 'jdbc:postgresql://...'
$env:DATABASE_USERNAME = 'postgres.<ref>'
$env:DATABASE_PASSWORD = '<password>'

cd backend
.\mvnw.cmd clean package   # ~3–5 min first time (downloads Node, dependencies)
java -jar target\login-app.jar
```

Open **http://localhost:8080** — the React UI and the REST API are served from
the same origin, exactly as they would be in production.

```bash
# bash / macOS / Linux
export DATABASE_URL='jdbc:postgresql://...'
export DATABASE_USERNAME='postgres.<ref>'
export DATABASE_PASSWORD='<password>'

cd backend
./mvnw clean package
java -jar target/login-app.jar
```

---

## Running Tests

```bash
cd backend
./mvnw test        # runs @SpringBootTest + MockMvc against in-memory H2
```

Tests run with profile `test` which disables Flyway and uses H2 with
`ddl-auto: create-drop`. No Supabase connection required.

---

## Application Pages

| Route | Description |
|---|---|
| `/` | Login page — email + password, links to Sign Up and Change Password |
| `/signup` | Sign Up — name, email, password, confirm, address, designation |
| `/home` | Protected — `Welcome home, {name}` + Logout (redirects to `/`) |
| `/change-password` | Change Password — email, old pw, new pw, confirm |

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | public | Authenticates, sets JSESSIONID cookie |
| POST | `/api/auth/signup` | public | Creates account |
| GET | `/api/auth/me` | session | Returns current user |
| POST | `/api/auth/logout` | session | Invalidates session |
| POST | `/api/auth/change-password` | public | Changes password (verifies old pw) |

---

## Security Notes

- Passwords are stored as BCrypt hashes — never in plain text.
- The JSESSIONID session cookie is `HttpOnly` (not accessible to JavaScript)
  and `SameSite=Lax` (sent on same-site navigations, blocks most CSRF vectors).
- Set `COOKIE_SECURE=true` in production (served over HTTPS) to add the
  `Secure` cookie flag.
- CSRF protection is intentionally disabled: same-origin SPA, JSON-only API,
  `SameSite=Lax` cookie. If you add cross-origin clients, re-enable CSRF.
- `/api/auth/me` and `/api/auth/logout` require an active session; all other
  `/api/**` paths do too. Public endpoints are explicitly allowed in
  `SecurityConfig`.
- Database credentials are passed only via environment variables — never
  hardcoded, never in version control.
- Supabase connection strings include `?sslmode=require` — enforced in
  `.env.example`.

---

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on every push and PR:

1. `./mvnw test` — compiles backend + runs all integration tests
2. `npm ci && npm run build` in `frontend/` — TypeScript type-check + Vite build
