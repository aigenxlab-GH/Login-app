# CLAUDE.md — Project Conventions & Non-Negotiable Rules

This file governs every code change in this repository.
Read it before touching anything. These rules are **not negotiable**.

---

## 1. Stack (source of truth)

| Layer | Technology |
|---|---|
| Backend runtime | Spring Boot 3.3.x, Java 21 |
| Backend auth | Spring Security 6, BCrypt, server-side HttpSession |
| Backend persistence | Spring Data JPA, Hibernate (validate DDL mode) |
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

1. `install-node-and-npm` — downloads Node v20 LTS into `frontend/node/`
2. `npm ci` — installs dependencies from the lock file
3. `npm run build` — Vite writes its output to
   `backend/src/main/resources/static/` (configured in `frontend/vite.config.ts`
   via `build.outDir`)

Maven's `process-resources` then copies that directory into the classpath, and
`spring-boot:repackage` seals everything into the executable JAR.

### Spring Boot serves everything
At runtime the JAR serves:

| Path | Handler |
|---|---|
| `/api/**` | Spring MVC `@RestController`s |
| `/` and known SPA routes | `static/index.html` (Spring Boot static resource handler) |
| Unknown non-API paths | `SpaForwardingConfig` forwards to `forward:/index.html` |

`SpaForwardingConfig` (`addViewControllers`) is **required**. Without it,
refreshing `/home` or `/signup` returns a 404 because the server has no
matching route.

---

## 3. Frontend API Rules (NON-NEGOTIABLE)

```
NEVER hardcode http://localhost or any hostname in frontend code.
ALWAYS use relative /api/... paths.
```

In **dev mode** (`npm run dev`), Vite's dev server runs on `:5173` and proxies
any request starting with `/api` to `http://localhost:8080`. This proxy is
configured in `frontend/vite.config.ts` and is a dev-only concern.

In **prod mode** (single JAR), there is only one origin, so relative `/api/...`
paths route directly to Spring Boot — no proxy, no CORS needed.

The fetch wrapper in `frontend/src/api/client.ts` **must** always use relative
paths and always set `credentials: 'include'` so the JSESSIONID cookie is sent
on every API request.

---

## 4. Auth Rules

- Authentication is handled entirely by Spring Boot.
- Users are stored in the `app_user` table in Supabase Postgres.
- Passwords are hashed with BCrypt via Spring Security's `PasswordEncoder`.
- Sessions are server-side HTTP sessions (JSESSIONID cookie, HttpOnly,
  SameSite=Lax).
- **Never use Supabase Auth, Supabase GoTrue, or any third-party auth SDK.**
- CSRF is disabled (same-origin SPA + JSON-only API + SameSite=Lax cookie).
  Re-enable if cross-origin clients are ever added.

---

## 5. Database Rules

- All schema changes go through Flyway migration files in
  `backend/src/main/resources/db/migration/`.
- Naming: `V{n}__{description}.sql` (two underscores).
- Hibernate DDL mode is `validate` — Hibernate never creates or alters tables.
- `supabase/migrations/` mirrors the Flyway SQL files as documentation.
- Raw JDBC for ad-hoc queries is allowed in `AuthService`; JPA for repositories.

---

## 6. Local Dev Mode

```bash
# Terminal 1 — backend on :8080
cd backend
./mvnw spring-boot:run \
  -Dspring-boot.run.jvmArguments="-DDATABASE_URL=... -DDATABASE_USERNAME=... -DDATABASE_PASSWORD=..."

# Terminal 2 — frontend on :5173 (proxies /api to :8080)
cd frontend
npm run dev
```

Open http://localhost:5173 in the browser.

---

## 7. Prod-Mode Local Test

```bash
cd backend
./mvnw clean package      # builds React + packages single JAR
java -jar target/login-app.jar
```

Env vars required before `java -jar` (PowerShell):
```powershell
$env:DATABASE_URL      = 'jdbc:postgresql://<host>:<port>/<db>?sslmode=require'
$env:DATABASE_USERNAME = 'postgres.<ref>'
$env:DATABASE_PASSWORD = '<password>'
```

Open http://localhost:8080 — both UI and API are served from the same origin.

---

## 8. Code Conventions

- Java: no Lombok. Plain getters/setters or records. Java 21 features OK.
- No `@Transactional` on controllers — only on `@Service` methods.
- DTOs are Java records.
- Error responses: always JSON `{"error":"...", "message":"...", "fieldErrors":{}}`.
- Tests: `@SpringBootTest` + `@ActiveProfiles("test")` + H2 in-memory.
  Flyway disabled in test profile; Hibernate uses `create-drop`.
- Frontend: no default exports from non-page files (use named exports).
- One `Field` helper component per form file — do not share across pages.

---

## 9. Files Never to Commit

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

## 10. Adding New Pages (checklist)

1. Create `frontend/src/pages/NewPage.tsx`
2. Add `<Route path="/new-path" element={<NewPage />} />` in `App.tsx`
3. `SpaForwardingConfig` handles server-side forwarding automatically
   (no changes needed as long as the path has no dot in it)
4. Add API endpoint(s) in `AuthController` or a new `@RestController`
5. Add Flyway migration if schema changes (new `V{n}__...sql`)
6. Add or update `@SpringBootTest` integration test

---

## 11. Environment Variables (full list)

See `.env.example` in the repo root for placeholders.

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | JDBC URL for Supabase Postgres |
| `DATABASE_USERNAME` | yes | Postgres username |
| `DATABASE_PASSWORD` | yes | Postgres password |
| `PORT` | no | Server port (default 8080) |
| `COOKIE_SECURE` | no | `true` in HTTPS prod; `false` locally |
