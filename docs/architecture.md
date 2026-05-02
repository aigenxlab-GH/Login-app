# Architecture Decision Record — Login App

## Single-JAR Production Style

**Decision**: Ship one executable Spring Boot JAR that contains both the REST
API and the React SPA.

**Rationale**: Eliminates the operational complexity of deploying, routing, and
coordinating two separate services (an API server and a static hosting service)
for a small application. Same-origin deployment means no CORS configuration,
no preflight requests, and no proxy layer in production.

**Trade-off**: The build step is slightly slower (Node must run during Maven
`package`), and you cannot independently scale the frontend. Neither trade-off
matters at this application's scale.

---

## Auth: Custom Table + Spring Security + BCrypt

**Decision**: Use a custom `app_users` table with BCrypt passwords and a
custom `app_sessions` table for server-side session management. **Not** Supabase Auth.

**Rationale**:
- Supabase Auth adds an SDK dependency and another point of failure.
- Server-side sessions are simple to reason about: session invalid → 401.
  No token refresh logic, no JWT key rotation.
- The `SESSION` cookie is `HttpOnly` (no XSS exposure) and `SameSite=Lax`
  (blocks cross-site request forgery from third-party sites).
- BCrypt is well-proven for password hashing and is natively supported by
  Spring Security.

**Session flow**:
1. `POST /api/auth/login` creates an `app_sessions` row and sets the `SESSION`
   httpOnly cookie with the session token.
2. `SessionAuthFilter` runs on every request: reads the cookie, validates the
   token against `app_sessions`, checks idle timeout (480 min), updates
   `last_seen_at`, and sets the `SecurityContextHolder` principal.
3. Stale/revoked cookies on page requests → cookie is expired and filter chain
   continues (login page loads normally). On API requests → 401 JSON.
4. `POST /api/auth/logout` revokes the session row and clears the cookie.

**Trade-off**: Sessions are stateful — stored in Postgres. A DB outage drops all
sessions. For this use case (Supabase-hosted Postgres with HA) that is acceptable.

---

## Role-Based Access Control

**Decision**: Two roles — `ADMIN` and `GENERAL` — stored in the `app_users.role`
column. Role is chosen at signup.

**Rules**:
- New accounts are created **inactive** (`is_active = false`). They cannot log in
  until an ADMIN activates them.
- Exception: the very first user ever registered is auto-activated to bootstrap
  the system.
- ADMIN users see all registered users in a management dashboard (HomePage).
- GENERAL users see only their own profile on the HomePage.
- Admin-only endpoints (`/api/admin/**`) enforce `requireAdmin()` — a helper that
  loads the caller's user row and checks `role = 'ADMIN'`. Admins cannot modify or
  delete their own account via these endpoints.

---

## Employee ID Auto-Assignment

**Decision**: Employee IDs are auto-assigned in the range 5001–5999 using
`COALESCE(MAX(employee_id), 5000) + 1`. Two assignment paths:

1. **First user ever** — auto-assigned at signup (`AuthService.signup()` calls
   `getNextEmployeeId()` immediately after insert). The first user always gets
   ID **5001**.
2. **All other users** — assigned the first time an ADMIN activates them via
   `PATCH /api/admin/users/{id}/status`.

**Rationale**: Sequential IDs in a defined range are easy to audit and provide a
human-readable identifier. The ID is assigned once and never changes even if the
user is deactivated/reactivated. Auto-assigning at signup for the first user
avoids the chicken-and-egg problem (no admin exists yet to activate them).

**Edge case**: If all 999 IDs in 5001–5999 are exhausted, `getNextEmployeeId()`
returns `-1` and the API returns `EMPLOYEE_ID_EXHAUSTED` (422). At this scale,
that scenario is theoretical.

---

## Frontend: Relative `/api` Paths Only

**Decision**: The React app calls the backend using only relative `/api/...`
paths, never a hardcoded `http://localhost:...` or a production domain.

**Rationale**: The same frontend bundle works in every environment:
- Dev mode: Vite proxies `/api/**` to Spring Boot on `:8085`.
- Prod JAR: same origin — no proxy needed.
- Cloud deployment: same origin.

No per-environment build configuration is needed.

---

## Flyway Migrations

**Decision**: Use Flyway SQL migrations. Hibernate runs in `validate` mode.

**Rationale**: Schema drift between environments is the most common source of
mysterious prod bugs. Flyway's versioned migrations make schema changes
explicit, reviewable, and reproducible.

**Migration history**:

| Version | Description |
|---|---|
| V1 | Initial `app_user` table (id, name, email, password_hash, address, designation) |
| V2 | Rename `app_user` → `app_users` (final table name) |
| V3 | Add `app_sessions` table (session_token, last_seen_at, revoked_at, etc.) |
| V4 | Add `failed_login_attempts`, `locked_until`, `role` (ADMIN/GENERAL) to `app_users` |
| V5 | Truncate all data + add `is_active` column (default false) |
| V6 | Drop and recreate both tables with `employee_id` (5001–5999) as 2nd column |
| V7 | Truncate all data — fresh start for testing first-user employee ID flow |

---

## Build: frontend-maven-plugin + Direct Vite Output

**Decision**: Use `com.github.eirslett:frontend-maven-plugin` to invoke `npm
install` and `npm run build` during `mvn package`. Vite is configured to write
its output **directly** to `backend/src/main/resources/static/` (via
`outDir: '../backend/src/main/resources/static'` in `vite.config.ts`).

**Rationale**: Keeps the build self-contained. Vite writing directly to the
final destination (no intermediate `frontend/dist/` step, no `maven-resources-plugin`
copy execution) is the simplest possible pipeline:

1. `generate-resources` phase: `npm run build` populates
   `backend/src/main/resources/static/`
2. `process-resources` phase (Maven default): copies all of
   `src/main/resources/**` (including the new `static/` files) into
   `target/classes/`
3. `package` phase: `maven-jar-plugin` JAR everything in `target/classes/`
4. `package` phase: `spring-boot:repackage` re-arranges into the BOOT-INF
   structure

**Anti-pattern (avoid)**: Adding a custom `maven-resources-plugin` execution
to copy `frontend/dist/ → src/main/resources/static/` (or
`→ target/classes/static/`) sounds reasonable but **breaks the build silently**.
Declaring the plugin with custom executions interferes with the inherited
default executions from `spring-boot-starter-parent`, causing YAML config
files and SQL migration files to be dropped from the JAR. The symptoms are
"Schema 'public' has version N, but no migration could be resolved" or
`NOT_FOUND` for `/`. Don't do it.

---

## Build Pipeline Hardening: Race Fix + Fail-Fast

**Problem**: On Windows, `frontend-maven-plugin`'s npm process exits
successfully **before** the OS flushes Vite's output files to disk. Maven sees
exit code 0 and proceeds to `process-resources`, which copies an incomplete
(or empty) `static/` into `target/classes/`. The JAR is packaged without the
SPA assets and the app returns
`{"code":"NOT_FOUND","message":"No static resource ."}` at runtime.

**Fix (two layers in `pom.xml` via `maven-antrun-plugin`)**:

1. **Race fix** — execution `refresh-frontend-static` at the `prepare-package`
   phase re-copies `src/main/resources/static/` → `target/classes/static/`.
   By this phase, `compile` (and optionally `test`) has run, putting 10–30
   seconds between npm exit and the copy — long past any filesystem flush
   delay.
2. **Fail-fast** — execution `verify-frontend-static` at the same phase
   checks `target/classes/static/index.html` exists via Ant's `<available>`
   condition. If missing, the build aborts with a loud "BUILD ABORTED:
   Vite output is missing" message listing the common causes.

**Guarantee**: any successful `mvnw clean package` produces a shippable JAR.
A "successful" build can never silently produce a broken JAR — verification
runs before `package` and stops the lifecycle if static assets are missing.

**Why not eliminate the race entirely**: Patching `frontend-maven-plugin` to
wait for filesystem sync is not feasible; explicit `<sleep>` calls are
fragile. Working around the race late enough that it doesn't matter (and
verifying the result) is the pragmatic, robust solution.

---

## SpaForwardingConfig

**Decision**: Add a `WebMvcConfigurer` that forwards specific non-asset, non-API
paths to `/index.html`.

**Rationale**: React Router handles client-side navigation, but when the user
refreshes `/home` or `/user/123` the server receives a GET for that path — which
has no Spring MVC handler. Without the forwarder, Spring Boot returns a 404.

Each SPA route is registered **explicitly** (not via a catch-all). A catch-all
regex is intentionally avoided because it would intercept `/swagger-ui` and
`/actuator` before their own handlers run.

**Registered SPA routes**: `/`, `/home`, `/signup`, `/change-password`,
`/user/{id}` (user detail page).

---

## Admin User List: Client-Side Filtering & Pagination

**Decision**: The admin user-management table (HomePage in admin mode) does its
filtering, sorting, and pagination **entirely on the client**. The backend
endpoint `GET /api/admin/users` returns the full unfiltered list.

**Rationale**:
- The expected user-base size for this app is small (tens to low hundreds of
  rows). Round-tripping to the server on every keystroke or page change would
  add latency for no real benefit at this scale.
- Keeping the API simple (one endpoint, no query params) reduces the surface
  area to test and document.
- React's `useMemo` makes deriving filtered/paginated views trivial and
  performant for these list sizes.

**Filter ribbon UX**:
- One "Filter by" criterion dropdown: `By Name`, `By ID`, `By Status`.
- The input beside it is **dynamic** — text input for Name/ID, status dropdown
  (`Active` / `Inactive`) for Status.
- Filtering only happens on **explicit "Apply Filter" button click** (or
  pressing Enter in the text input). Changing the criterion dropdown clears
  the text input but never triggers a filter on its own.
- A "Reset" button appears once a filter is applied.

**Pagination**:
- Page size dropdown: `5` (default) / `10` / `15`.
- Up to **5 page-number buttons** are visible at any time, sliding around the
  current page (Math.floor(max/2) on each side, clamped to the total range).
- `‹ Prev` / `Next ›` buttons disable at the edges.
- Changing the filter or page size resets to page 1.

**When to switch to server-side**: If the user count exceeds ~500 rows, move
filtering/pagination to the backend with `?page=&size=&q=&filterBy=&status=`
query parameters and return a `Page<UserResponse>` envelope (`content`,
`totalPages`, `totalElements`).

---

## SessionAuthFilter: API vs Page Request Handling

**Decision**: Stale/expired session cookies are handled differently depending on
whether the request is an API call or a page/asset load.

**Rationale**: Before this split, a stale `SESSION` cookie (e.g., after a DB
migration wipes `app_sessions`) caused the filter to return a 401 JSON error on
every request — including the login page itself, making the app unrecoverable
in the browser without manually clearing cookies.

**Behavior**:
- `/api/**` requests with a stale cookie → `401 SESSION_TIMED_OUT` JSON (so
  the frontend can redirect to login).
- Page/asset requests with a stale cookie → expire the cookie (set `Max-Age=0`)
  and continue the filter chain so the login page loads normally.
