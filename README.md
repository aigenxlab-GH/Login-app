# Login App

A production-grade, **single-JAR** web application with a 4-page authentication
flow. One executable JAR serves the Spring Boot REST API and the React UI.

---

## Stack

| Layer | Technology |
|---|---|
| Backend | Spring Boot 3.3.x · Java 21 · Maven |
| Security | Spring Security 6 · Argon2id + pepper · custom DB sessions |
| Database | Supabase Postgres (JDBC + Flyway) |
| Frontend | React 18 · Vite 5 · TypeScript · Tailwind CSS 3 |
| Routing | react-router-dom v6 |

---

## Production-Style Architecture

```
┌────────────────── login-app.jar (single deployable) ──────────────────┐
│                                                                        │
│  Spring Boot                                                           │
│  ├── /api/**       REST controllers (auth)                             │
│  └── /**           Static handler → React SPA (index.html + assets)   │
│                    SpaFallbackController → forward:/index.html         │
│                    for /home, /signup, /change-password deep-links     │
└────────────────────────────────────────────────────────────────────────┘
```

**Build pipeline** (`.\mvnw.cmd clean package` inside `backend\`):

1. `maven-clean-plugin` wipes `backend\src\main\resources\static\` (removes stale hashed assets).
2. `frontend-maven-plugin` runs `npm install` then `npm run build` (uses system Node).
3. Vite writes output to `frontend\dist\`.
4. `maven-resources-plugin` copies `frontend\dist\` → `src\main\resources\static\`.
5. Spring Boot repackages everything into `backend\target\login-app.jar`.
6. `java -jar backend\target\login-app.jar` serves UI at `/` and API at `/api/**` — same origin, no CORS.

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
│   └── vite.config.ts        outDir → dist (Maven copies to static/)
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

| Tool | Version | Check |
|---|---|---|
| Java | 17+ (LTS) | `java -version` |
| Node.js | 18+ (20 LTS recommended) | `node --version` |
| npm | 9+ | `npm --version` |

Maven is not required — the `mvnw.cmd` wrapper is included.

---

## Environment Setup

```powershell
Copy-Item .env.example .env   # never commit .env
# edit .env with your Supabase credentials
```

Required variables (see `.env.example` for all options):

```
DATABASE_URL=jdbc:postgresql://<host>:6543/postgres?sslmode=require
DATABASE_USERNAME=postgres.<project-ref>
DATABASE_PASSWORD=<your-db-password>
AUTH_PASSWORD_PEPPER=<long-random-string>
```

Get the JDBC URL from:
**Supabase Dashboard → Project → Settings → Database → Connection string → JDBC**

---

## Database Setup (first time)

Flyway runs automatically on startup and applies all migrations in
`backend/src/main/resources/db/migration/`.

---

## Running Locally

### Dev Mode (hot reload)

Two processes, two ports. React changes reflect immediately; Spring Boot changes
require a restart.

```powershell
.\scripts\run-dev.ps1
```

Opens: **http://localhost:5173** (Vite, proxies `/api` → Spring Boot on :8080)

Ctrl+C stops both processes. See [`docs/LOCAL_RUN.md`](docs/LOCAL_RUN.md) for
log watching, status checks, and manual alternatives.

### Prod-Mode Local Test (single JAR)

One process, one port — identical to what runs in production.

```powershell
.\scripts\run-prod-local.ps1
```

Opens: **http://localhost:8080**

Maven builds the React app, bundles it into the Spring Boot JAR, and starts it.
The UI and API are served from the same origin with no Vite proxy.

---

## Running Tests

```powershell
cd backend
.\mvnw.cmd test        # Mockito unit tests — no database required
```

---

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
| POST | `/api/auth/login` | public | Authenticates, sets `SESSION` cookie |
| POST | `/api/auth/signup` | public | Creates account |
| GET | `/api/auth/me` | session | Returns current user |
| POST | `/api/auth/logout` | session | Revokes session, clears cookie |
| POST | `/api/auth/change-password` | public | Changes password, revokes all sessions |

---

## Security Notes

- Passwords hashed with **Argon2id** (3 iterations, 64 MB, parallelism 1) plus a server-side pepper (`AUTH_PASSWORD_PEPPER`). A leaked database alone cannot be cracked offline without the pepper.
- Sessions stored in the `app_sessions` DB table. The `SESSION` cookie is `HttpOnly`, `SameSite=Lax`. Idle sessions expire after 30 minutes.
- The `Secure` cookie flag is automatically set when the active Spring profile is **not** `local` — no env var required.
- CSRF is disabled: same-origin SPA, JSON-only API, `SameSite=Lax` cookie.
- Account lockout: after configurable failed login attempts (`AUTH_MAX_FAILED_ATTEMPTS`, default 5), the account locks for `AUTH_LOCKOUT_MINUTES` (default 15).
- All secrets (DB password, pepper) are supplied only via environment variables — never hardcoded or committed.
- Supabase connection strings include `?sslmode=require` — enforced in `.env.example`.

---

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on every push and PR:

1. `./mvnw test` — compiles backend + runs all integration tests
2. `npm ci && npm run build` in `frontend/` — TypeScript type-check + Vite build
