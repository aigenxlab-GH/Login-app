# Login App

A production-grade, **single-JAR** web application with role-based authentication
and user management. One executable JAR serves the Spring Boot REST API and the
React UI on **port 8085**.

---

## Stack

| Layer | Technology |
|---|---|
| Backend | Spring Boot 3.3.x · Java 21 · Maven |
| Security | Spring Security 6 · BCrypt · custom DB session table |
| Database | Supabase Postgres (JDBC + Flyway) |
| Frontend | React 18 · Vite 5 · TypeScript · Tailwind CSS 3 |
| Routing | react-router-dom v6 |

---

## Production-Style Architecture

```
┌────────────────── login-app.jar (single deployable) ──────────────────┐
│                                                                        │
│  Spring Boot                                                           │
│  ├── /api/auth/**    Auth endpoints (login, signup, logout, me)        │
│  ├── /api/admin/**   Admin-only endpoints (users, status, delete)      │
│  └── /**             Static handler → React SPA (index.html + assets)  │
│                      SpaFallbackController → forward:/index.html       │
│                      for /home, /signup, /change-password, /user/:id   │
└────────────────────────────────────────────────────────────────────────┘
```

**Build pipeline** (`.\mvnw.cmd clean package` inside `backend\`):

1. `maven-clean-plugin` wipes `backend\src\main\resources\static\`.
2. `frontend-maven-plugin` runs `npm install` then `npm run build` (uses system Node).
3. Vite writes output **directly** to `backend\src\main\resources\static\`
   (configured in `frontend\vite.config.ts` via `outDir`).
4. Maven's default `process-resources` copies `src\main\resources\**` (including
   the freshly built `static\`) to `target\classes\`.
5. Spring Boot repackages `target\classes\` into `backend\target\login-app.jar`
   under `BOOT-INF\classes\`.
6. `java -jar backend\target\login-app.jar` serves UI at `/` and API at `/api/**` — same origin, no CORS.

---

## Repository Layout

```
login-app/
├── backend/                  Spring Boot (Java 21, Maven)
│   ├── pom.xml               Includes frontend-maven-plugin
│   ├── mvnw / mvnw.cmd       Maven wrapper (no local Maven needed)
│   └── src/
│       ├── main/java/
│       │   └── com/aigenxlab/loginapp/
│       │       ├── auth/         AuthController, AuthService, SessionAuthFilter, DTOs
│       │       ├── admin/        AdminController (user management)
│       │       ├── user/         User entity, UserRepository
│       │       ├── session/      AppSession entity, SessionRepository
│       │       ├── config/       SecurityConfig, SpaFallbackController, AuthProperties
│       │       └── error/        AppException, ApiErrorResponse, GlobalExceptionHandler
│       ├── main/resources/
│       │   ├── application.yml
│       │   ├── db/migration/     Flyway SQL migrations (V1–V7)
│       │   └── static/           ← Vite build output (gitignored)
│       └── test/                 Mockito unit tests (H2 in-memory)
├── frontend/                 React + Vite + TypeScript + Tailwind
│   └── src/
│       ├── pages/            LoginPage, SignupPage, ChangePasswordPage,
│       │                     HomePage (role-aware), UserDetailPage
│       ├── components/       ProtectedRoute, PageShell
│       └── api/              client.ts (fetch wrapper), auth.ts (API functions)
├── docs/                     Architecture decisions, local run guide
├── CLAUDE.md                 Project conventions (read before touching code)
└── .gitignore
```

---

## Prerequisites

| Tool | Version | Check |
|---|---|---|
| Java | 21 (LTS) | `java -version` |
| Node.js | 18+ (20 LTS recommended) | `node --version` |
| npm | 9+ | `npm --version` |

Maven is not required — the `mvnw.cmd` wrapper is included and downloads Maven
automatically. Node is also downloaded by the Maven plugin during `mvn package`.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | `jdbc:postgresql://<host>:6543/postgres?sslmode=require` |
| `DATABASE_USERNAME` | yes | `postgres.<project-ref>` |
| `DATABASE_PASSWORD` | yes | Your Supabase DB password |
| `PORT` | no | Server port (default **8085**) |
| `COOKIE_SECURE` | no | `true` for HTTPS production; `false` locally |

Get the JDBC URL from:
**Supabase Dashboard → Project → Settings → Database → Connection string → JDBC**

---

## Running Locally

### Prod-Mode (single JAR — recommended)

```powershell
cd backend
.\mvnw.cmd clean package

java -jar target\login-app.jar `
  "--spring.datasource.url=jdbc:postgresql://<host>:6543/postgres?sslmode=require" `
  "--spring.datasource.username=postgres.<ref>" `
  "--spring.datasource.password=<password>"
```

Open **http://localhost:8085**

### Dev Mode (hot reload)

```powershell
# Terminal 1 — backend
cd backend
.\mvnw.cmd spring-boot:run "--spring.datasource.url=..." "--spring.datasource.username=..." "--spring.datasource.password=..."

# Terminal 2 — frontend (proxies /api to :8085)
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

See [`docs/LOCAL_RUN.md`](docs/LOCAL_RUN.md) for full details and troubleshooting.

---

## Running Tests

```powershell
cd backend
.\mvnw.cmd test        # Mockito unit tests — no database required
```

---

## Application Pages

| Route | Access | Description |
|---|---|---|
| `/` | Public | Login — email + password; links to Sign Up and Change Password |
| `/signup` | Public | Create account — name, email, password, address, designation, role (Admin/General) |
| `/change-password` | Public | Change password — email, old password, new password |
| `/home` | Protected | **Admin**: enterprise user-management table (filter ribbon + pagination + activate/deactivate/delete) · **General**: own profile |
| `/user/:id` | Protected (Admin) | User detail page — all fields, status toggle, remove button |

### Admin User Management Table

The admin `/home` view ships an enterprise-style data grid with:

- **Filter ribbon** — `By Name` / `By ID` / `By Status` criterion dropdown +
  dynamic input (text or status dropdown) + `Apply Filter` button. Filtering
  only fires on button click (or Enter in the text input), never on selection.
- **Pagination** — `Rows per page` dropdown (5 / 10 / 15), up to 5 page
  buttons in a sliding window, `‹ Prev` / `Next ›` controls, and a live
  `X–Y of Z` counter.
- **Columns** — `#` (row number), `Employee ID` (highlighted chip), `Name`
  (clickable → user detail page), `Email`, `Designation`, `Status` (badge +
  Activate/Deactivate button), `Action` (Remove with confirmation).

All filtering/pagination is **client-side** (`useMemo` over the full list
returned by `GET /api/admin/users`). See `docs/architecture.md` for when to
switch to server-side filtering.

---

## API Endpoints

### Auth (`/api/auth/**`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | public | Authenticates, sets `SESSION` cookie |
| POST | `/api/auth/signup` | public | Creates inactive account (first user is auto-activated **and** gets employee ID 5001) |
| GET | `/api/auth/me` | session | Returns current user |
| POST | `/api/auth/logout` | session | Revokes session, clears cookie |
| POST | `/api/auth/change-password` | public | Changes password, revokes all sessions |

### Admin (`/api/admin/**` — ADMIN role only)

| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/users` | List all users |
| GET | `/api/admin/users/{id}` | Get a single user by ID |
| PATCH | `/api/admin/users/{id}/status` | Activate or deactivate a user (auto-assigns employee ID on first activation) |
| DELETE | `/api/admin/users/{id}` | Delete a user and revoke all their sessions |

---

## Database Schema

**Table: `app_users`**

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `employee_id` | INTEGER | Nullable; 5001–5999; auto-assigned on first activation |
| `name` | TEXT | |
| `email` | TEXT | Unique |
| `password_hash` | TEXT | BCrypt |
| `address` | TEXT | |
| `designation` | TEXT | |
| `role` | TEXT | `ADMIN` or `GENERAL` |
| `is_active` | BOOLEAN | Default `false` |
| `failed_login_attempts` | INT | Lockout counter |
| `locked_until` | TIMESTAMPTZ | Null when not locked |
| `password_updated_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Table: `app_sessions`**

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → `app_users.id` ON DELETE CASCADE |
| `session_token` | TEXT | Unique; stored in `SESSION` cookie |
| `created_at` | TIMESTAMPTZ | |
| `last_seen_at` | TIMESTAMPTZ | Updated on every authenticated request |
| `revoked_at` | TIMESTAMPTZ | Null = active session |
| `ip_address` | TEXT | |
| `user_agent` | TEXT | |

---

## Security Notes

- Passwords hashed with **BCrypt** (Spring Security default strength).
- Sessions stored in `app_sessions` table. The `SESSION` cookie is `HttpOnly`,
  `SameSite=Lax`. Idle sessions expire after **480 minutes** (8 hours).
- Admins cannot delete or change the activation status of their own account.
- When a user is deactivated, all their active sessions are immediately revoked.
- When a user is deleted, all their sessions are revoked before deletion.
- CSRF is disabled: same-origin SPA, JSON-only API, `SameSite=Lax` cookie.
- `COOKIE_SECURE` should be set to `true` in production (HTTPS).

---

## First-Time Bootstrap

On a fresh database, the **first user to sign up**:

- Can choose either **Admin** or **General** role
- Is automatically **activated** (no admin needed to approve)
- Is automatically assigned **Employee ID 5001**

Every subsequent user starts as **inactive** with no employee ID, and must be
activated by an Admin before they can log in. Their employee ID is assigned
sequentially (5002, 5003, …) when the Admin activates them.

See [`docs/LOCAL_RUN.md`](docs/LOCAL_RUN.md) for a step-by-step bootstrap walkthrough.
