# CLAUDE.md — Project Conventions & Non-Negotiable Rules

This file governs every code change in this repository.
Read it before touching anything. These rules are **not negotiable**.

---

## 1. Stack (source of truth)

| Layer | Technology |
|---|---|
| Backend runtime | Spring Boot 3.3.x, Java 21 |
| Backend auth | Spring Security 6, **Argon2id + server-side pepper**, custom DB session table |
| Backend persistence | Spring Data JPA + raw JDBC (NamedParameterJdbcTemplate), Hibernate (validate DDL mode) |
| Database | Supabase Postgres via JDBC — **never Supabase Auth** |
| Schema migrations | Flyway (SQL files in `backend/src/main/resources/db/migration/`) |
| Frontend | React 18, Vite 5, TypeScript (strict), Tailwind CSS 3 |
| Frontend routing | react-router-dom v6 |
| Package manager | npm (lock file required — always commit `package-lock.json`) |

---

## 2. Production-Style Architecture (NON-NEGOTIABLE)

### Single executable JAR
`./mvnw clean package` produces **one** Spring Boot JAR at
`backend/target/login-app.jar` that contains:

- All Spring Boot classes and dependencies
- The complete Vite production build of the React app
  (placed at `BOOT-INF/classes/static/` inside the JAR)

This JAR is the **only deployable artifact**. Never produce or deploy a
separate frontend server in production.

### How the single JAR is produced
`backend/pom.xml` uses `com.github.eirslett:frontend-maven-plugin` bound to
the `generate-resources` phase:

1. `npm install` — installs dependencies (uses system Node from PATH)
2. `npm run build` — Vite writes its output **directly** to
   `backend/src/main/resources/static/` (configured in `frontend/vite.config.ts`
   via `build.outDir: '../backend/src/main/resources/static'`)

Then Maven's default `process-resources` (which runs in the next phase) copies
`src/main/resources/**` (including the freshly populated `static/`) into
`target/classes/`, and `spring-boot:repackage` seals everything into the
executable JAR at `BOOT-INF/classes/static/`.

**Important**: Do **not** add a custom `maven-resources-plugin` copy execution
to move files from `frontend/dist` → `static/`. That intermediate step was
removed because it interfered with Maven's default resource processing and
caused YAML / SQL migration files to be silently excluded from the JAR.
Vite writes directly to the final destination — keep it that way.

### Spring Boot serves everything
At runtime the JAR serves:

| Path | Handler |
|---|---|
| `/api/**` | Spring MVC `@RestController`s |
| `/` and known SPA routes | `static/index.html` (Spring Boot static resource handler) |
| Unknown non-API paths | `SpaForwardingConfig` forwards to `forward:/index.html` |

`SpaForwardingConfig` (`addViewControllers`) is **required**. Without it,
refreshing `/home` or `/user/:id` returns a 404 because the server has no
matching route.

---

## 3. Frontend API Rules (NON-NEGOTIABLE)

```
NEVER hardcode http://localhost or any hostname in frontend code.
ALWAYS use relative /api/... paths.
```

In **dev mode** (`npm run dev`), Vite's dev server runs on `:5173` and proxies
any request starting with `/api` to `http://localhost:8085`. This proxy is
configured in `frontend/vite.config.ts` and is a dev-only concern.

In **prod mode** (single JAR), there is only one origin, so relative `/api/...`
paths route directly to Spring Boot — no proxy, no CORS needed.

The fetch wrapper in `frontend/src/api/client.ts` **must** always use relative
paths and always set `credentials: 'include'` so the SESSION cookie is sent
on every API request.

---

## 4. Auth Rules

- Authentication is handled entirely by Spring Boot.
- Users are stored in the `app_users` table in Supabase Postgres.
- Passwords are hashed with **Argon2id** (3 iterations, 64 MB memory,
  parallelism 1) via `de.mkammerer:argon2-jvm`, with a server-side **pepper**
  (`AUTH_PASSWORD_PEPPER` env var) appended to the raw password before hashing.
  See `auth/PasswordService.java`. A leaked DB alone cannot be cracked offline
  without the pepper.
- **Critical**: every JAR run must be supplied the **same** pepper that was
  used when accounts were created. If you restart the JAR with a different
  (or missing) pepper, every existing user's hash will fail to verify and
  they'll all see `INVALID_CREDENTIALS`. Always pass
  `--auth.password.pepper=<value from .env>` when starting the JAR.
- Sessions are stored in the `app_sessions` DB table. A custom `SESSION` httpOnly
  cookie (SameSite=Lax) carries the session token. `SessionAuthFilter` validates
  the token on every request.
- **Never use Supabase Auth, Supabase GoTrue, or any third-party auth SDK.**
- CSRF is disabled (same-origin SPA + JSON-only API + SameSite=Lax cookie).
  Re-enable if cross-origin clients are ever added.
- Idle session timeout: **480 minutes** (configured in `AuthProperties.java` and
  `application.yml`).
- Account lockout: after `auth.lockout.max-failed-attempts` (default 5) failed
  login attempts, the account locks for `auth.lockout.lockout-minutes`
  (default 15).

---

## 5. Database Rules

- All schema changes go through Flyway migration files in
  `backend/src/main/resources/db/migration/`.
- Naming: `V{n}__{description}.sql` (two underscores).
- Hibernate DDL mode is `validate` — Hibernate never creates or alters tables.
- Current migration history:
  V1 (init) → V2 (rename to app_users) → V3 (sessions) → V4 (lockout/role) →
  V5 (truncate + is_active) → V6 (employee_id, full rebuild) → V7 (truncate
  all) → V8 (wipe for fresh start).
- Raw JDBC (`NamedParameterJdbcTemplate`) is used in `UserRepository` and
  `SessionRepository` for all queries.

---

## 6. User Roles & Activation

- Every user has a `role` column: `ADMIN` or `GENERAL`.
- New accounts are created **inactive** (`is_active = false`) by default.
- **Exception**: the very first user ever registered is auto-activated and is
  also auto-assigned employee ID **5001** at signup (handled in
  `AuthService.signup()`).
- Only an ADMIN can activate or deactivate other users via
  `PATCH /api/admin/users/{id}/status`.
- Users with `is_active = false` cannot log in — they receive
  `ACCOUNT_NOT_ACTIVATED` (403).
- When an ADMIN activates a user for the first time, an **employee ID** is
  auto-assigned in the range 5001–5999 (sequential, `MAX(employee_id) + 1`).
  Employee IDs are never reassigned after deactivation/reactivation.
- If all 999 employee IDs are exhausted, the API returns
  `EMPLOYEE_ID_EXHAUSTED` (422).

---

## 7. Local Dev Mode

```bash
# Terminal 1 — backend on :8085
cd backend
./mvnw spring-boot:run \
  -Dspring-boot.run.jvmArguments="-DDATABASE_URL=... -DDATABASE_USERNAME=... -DDATABASE_PASSWORD=..."

# Terminal 2 — frontend on :5173 (proxies /api to :8085)
cd frontend
npm run dev
```

Open http://localhost:5173 in the browser.

---

## 8. Prod-Mode Local Test

```bash
cd backend
./mvnw clean package      # builds React + packages single JAR
java -jar target/login-app.jar
```

Env vars required before `java -jar` (PowerShell — pass as Spring args):
```powershell
java -jar target\login-app.jar `
  "--spring.datasource.url=jdbc:postgresql://<host>:<port>/<db>?sslmode=require" `
  "--spring.datasource.username=postgres.<ref>" `
  "--spring.datasource.password=<password>"
```

Open http://localhost:8085 — both UI and API are served from the same origin.

---

## 9. Code Conventions

- Java: no Lombok. Plain getters/setters or records. Java 21 features OK.
- No `@Transactional` on controllers — only on `@Service` methods.
- DTOs are Java records.
- Error responses: always JSON `{"code":"...", "message":"..."}` via `ApiErrorResponse`.
- All named error codes are static factory methods on `AppException`.
- Tests: `@SpringBootTest` + `@ActiveProfiles("test")` + H2 in-memory.
  Flyway disabled in test profile; Hibernate uses `create-drop`.
- Frontend: no default exports from non-page files (use named exports).
- One `Field` helper component per form file — do not share across pages.
- UI style: glassmorphism (`bg-white/30 backdrop-blur-md ring-1 ring-white/50 rounded-3xl`).
  Keep consistent across all pages.
- Filtering & pagination: **filtering & sorting happen client-side** in
  `useMemo` over the full list returned by `GET /api/admin/users`. This is
  intentional for the current scale (small user counts). If the user table
  ever grows beyond a few hundred rows, switch to server-side
  filtering/pagination (`?page=&size=&sortBy=&q=`).
- Filter triggers: **never apply a filter on every keystroke or on dropdown
  change**. Always require an explicit "Apply" button click (or Enter key in
  the text input). This is the convention for every filter ribbon.

---

## 13. Form Validation Conventions (NON-NEGOTIABLE)

Every user-facing form (Login, Signup, Change Password, etc.) **must** use the
shared validation infrastructure:

- **`frontend/src/lib/validation.ts`** — composable validators (`required`,
  `email`, `minLength`, `maxLength`, `matches`, `pattern`) plus
  `mapBackendError` that maps every `AppException` code to a friendly message
  and the right field.
- **`frontend/src/lib/useFormValidation.ts`** — reusable hook that owns
  values, errors, touched state, form-level error, and the `applyServerError`
  bridge from API responses to inline errors.
- **`frontend/src/components/FormField.tsx`** — shared `FormField`,
  `FormSelect`, `FormErrorSummary` with red ring on error, helper text,
  inline error icon, and ARIA wiring (`aria-invalid`, `aria-describedby`,
  `aria-required`).

Backend DTOs (`SignupRequest`, `LoginRequest`, `ChangePasswordRequest`)
**must** carry user-friendly Jakarta validation messages
(`@NotBlank(message = "...")`). The frontend mirrors these length/format
constraints exactly so client-side and server-side validation agree.

UX rules (do not deviate per page):

1. Field errors **do not show** on first render. They appear only after the
   field is touched (`onBlur`) or after the user submits.
2. Once shown, errors update on every keystroke and disappear as soon as
   the input becomes valid.
3. Submit calls `validateAll()` — marks every field touched and shows all
   errors at once. Don't disable the submit button based on form validity;
   let users click and see the errors.
4. Server errors with a `details` map (`VALIDATION_FAILED`) populate
   per-field errors automatically.
5. Server errors mapped to a specific field (e.g. `EMAIL_ALREADY_EXISTS` →
   email, `OLD_PASSWORD_INVALID` → oldPassword) appear inline on that field;
   everything else goes in `FormErrorSummary` at the form level.

---

## 10. Files Never to Commit

```
.env
.env.local
backend/target/
backend/src/main/resources/static/   # generated by build
frontend/node_modules/
frontend/node/
frontend/dist/
```

---

## 11. Adding New Pages (checklist)

1. Create `frontend/src/pages/NewPage.tsx`
2. Add `<Route path="/new-path" element={<NewPage />} />` in `App.tsx`
3. **Add the path to `SpaFallbackController.java`** — this step is mandatory.
   The controller lists every SPA route explicitly so that hard-refreshing a
   deep-link returns `index.html` instead of a 404. A catch-all regex is
   intentionally NOT used because it would intercept `/swagger-ui` and
   `/actuator` before their own handlers run.
4. Add API endpoint(s) in `AuthController`, `AdminController`, or a new `@RestController`
5. Add Flyway migration if schema changes (new `V{n}__...sql`)
6. Add or update `@SpringBootTest` integration test

---

## 12. Environment Variables (full list)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | JDBC URL for Supabase Postgres (include `?sslmode=require`) |
| `DATABASE_USERNAME` | yes | Postgres username |
| `DATABASE_PASSWORD` | yes | Postgres password |
| `AUTH_PASSWORD_PEPPER` | **yes** | Long random string used by Argon2id. Generate with `openssl rand -hex 32`. **Must remain stable** — changing it invalidates every existing user password hash. |
| `AUTH_MAX_FAILED_ATTEMPTS` | no | Failed-login lockout threshold (default 5) |
| `AUTH_LOCKOUT_MINUTES` | no | Lockout duration in minutes (default 15) |
| `PORT` | no | Server port (default **8085**) |
| `COOKIE_SECURE` | no | `true` in HTTPS prod; `false` locally |
