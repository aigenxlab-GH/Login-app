# Local Run Guide

Two modes for running the Login App locally on Windows.
The app runs on **port 8085** by default.

---

## 1. Environment Variables (required for both modes)

The following variables must be set before starting the application:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | JDBC URL — e.g. `jdbc:postgresql://<host>:6543/postgres?sslmode=require` |
| `DATABASE_USERNAME` | yes | Postgres username — e.g. `postgres.<project-ref>` |
| `DATABASE_PASSWORD` | yes | Postgres password |
| `AUTH_PASSWORD_PEPPER` | **yes** | Long random string used by Argon2id. Generate once with `openssl rand -hex 32` and **never change it** — every existing user's password hash will become unverifiable. |
| `PORT` | no | Server port (default **8085**) |
| `COOKIE_SECURE` | no | `true` for HTTPS production; `false` locally |

> **The pepper is critical**: every JAR run must be supplied the **same**
> pepper. If you start the JAR without it (or with a different value),
> existing users will all see "Email or password is incorrect" because
> their stored Argon2id hashes can no longer be verified.

Get the JDBC URL from:
**Supabase Dashboard → Project → Settings → Database → Connection string → URI → JDBC**

---

## Mode A — Dev Mode (hot reload)

Two processes, two ports. Changes to frontend or backend code are reflected
without a full rebuild.

### Manual steps (two terminals)

**Terminal 1 — Backend on :8085**
```powershell
cd backend
.\mvnw.cmd spring-boot:run `
  "--spring.datasource.url=jdbc:postgresql://<host>:<port>/<db>?sslmode=require" `
  "--spring.datasource.username=postgres.<ref>" `
  "--spring.datasource.password=<password>" `
  "--auth.password.pepper=<long-random-string>"
```

Wait for: `Started LoginAppApplication` in the console (~15–30 s).

**Terminal 2 — Frontend on :5173**
```powershell
cd frontend
npm install   # first time only
npm run dev
```

**Open:** http://localhost:5173

Vite proxies all `/api/**` requests to Spring Boot on `:8085`.

---

## Mode B — Prod-Mode Local Test (single JAR)

One process, one port — identical to what runs in production.

### Build and start

```powershell
# Step 1: build the JAR (from backend directory)
cd backend
.\mvnw.cmd clean package

# Step 2: start with DB credentials AND pepper as Spring args
java -jar target\login-app.jar `
  "--spring.datasource.url=jdbc:postgresql://<host>:<port>/<db>?sslmode=require" `
  "--spring.datasource.username=postgres.<ref>" `
  "--spring.datasource.password=<password>" `
  "--auth.password.pepper=<long-random-string>"
```

**Open:** http://localhost:8085

- The UI (`/`) and the API (`/api/**`) are served from the same origin.
- No Vite, no proxy — exactly what would run in production.
- Press **Ctrl+C** to stop.

### Skip the build (if JAR is already current)

```powershell
java -jar C:\AIGenXLab\Projects\Login-app\backend\target\login-app.jar `
  "--spring.datasource.url=..." `
  "--spring.datasource.username=..." `
  "--spring.datasource.password=..." `
  "--auth.password.pepper=..."
```

> **Note:** Always use the **absolute path** to the JAR when not `cd`-ing into
> `backend\` first, to avoid `Unable to access jarfile` errors.

---

## Flyway Migrations

Flyway runs automatically on every startup and applies any pending migrations
from `backend/src/main/resources/db/migration/`. Current migrations: **V1–V8**.

If the DB has been wiped or recreated, all 8 migrations will run on first startup.
**No manual SQL is needed.**

---

## First-Time Setup (bootstrap admin account)

After starting the app for the first time on a fresh DB:

1. Open http://localhost:8085
2. Click **Sign Up** and create the first account — choose **Admin** role.
3. The first user ever registered is automatically:
   - **Activated** (`is_active = true`)
   - Assigned **Employee ID 5001**
4. Log in and use the Admin dashboard to manage subsequent users.

All other users who sign up after the first one will start as **inactive** and
must be activated by an Admin before they can log in. Their employee ID is
assigned (5002, 5003, …) the first time the Admin activates them.

---

## Admin User Management Page

When you log in as an Admin, the dashboard shows a wide table of all other
users with these enterprise-style controls:

### Filter ribbon (top of the table)

| Control | Behaviour |
|---|---|
| `Filter by` dropdown | Choose `By Name`, `By ID`, or `By Status` |
| Input beside it | Text field for Name/ID; dropdown (Active/Inactive) for Status |
| `Apply Filter` button | Filter only fires on click (or Enter in the text input) |
| `Reset` button | Appears once a filter is applied; clears everything |

> **Important**: changing the dropdown does **not** filter on its own. You
> must click `Apply Filter` (or press Enter in the text field). This is by
> design — see `CLAUDE.md` § 9.

### Pagination footer

| Control | Behaviour |
|---|---|
| `Rows per page` dropdown | `5` (default) / `10` / `15` |
| `X–Y of Z` counter | Live count of visible vs total rows (filtered or not) |
| Page-number buttons | Up to 5 visible at a time, sliding window |
| `‹ Prev` / `Next ›` | Disabled at the first / last page |

Changing the page size or applying a filter resets to **page 1**.

---

## Troubleshooting

### "Port 8085 is already in use"

```powershell
# Find what is using port 8085
netstat -ano | findstr :8085
# Kill the process by PID
taskkill /PID <PID> /F
```

### "Email or password is incorrect" for a user that *does* exist

If `EMAIL_ALREADY_EXISTS` confirms the account is in the DB but login keeps
failing for the right password, the running JAR is using a **different
pepper** than the one used when the account was created. Two common causes:

1. The JAR was started without `--auth.password.pepper=...` (or
   `AUTH_PASSWORD_PEPPER=...`) and is picking up an empty/different value
   from the parent shell's env.
2. You changed `AUTH_PASSWORD_PEPPER` in `.env` since the user signed up.

**Fix** — restart the JAR explicitly passing the same pepper used at signup:

```powershell
java -jar target\login-app.jar `
  "--spring.datasource.url=..." `
  "--spring.datasource.username=..." `
  "--spring.datasource.password=..." `
  "--auth.password.pepper=$pepper_from_env"
```

If you've genuinely lost the original pepper, the only path forward is to
wipe the database (add a new Flyway migration `V{N}__truncate_all.sql`
that does `DELETE FROM app_sessions; DELETE FROM app_users;`), restart, and
sign up fresh. There is no recovery without the original pepper — that's
the whole point of a pepper.

### Spring Boot fails to start — database errors

```
Could not resolve placeholder 'spring.datasource.url'
```
The DB credentials were not passed. Pass them as `--spring.datasource.*` args
after the JAR path (see examples above).

```
Could not resolve placeholder 'AUTH_PASSWORD_PEPPER'
```
You forgot `--auth.password.pepper=...`. Pass it as a Spring arg, or set the
`AUTH_PASSWORD_PEPPER` env var before launching the JAR.

```
Connection refused / FATAL: password authentication failed
```
The Supabase credentials are wrong. Re-check:
**Supabase Dashboard → Settings → Database → Connection string → JDBC**
Use the **connection pooler** URL (port 6543), not the direct connection (port 5432).

```
Flyway: Unable to obtain connection
```
Same cause as above, or the Supabase project is paused (free tier pauses after
inactivity). Restore it in the Supabase Dashboard first.

### `{"code":"SESSION_TIMED_OUT",...}` shown on page load

Your browser has a stale `SESSION` cookie from a previous session (e.g., after
the DB was wiped). This is now handled gracefully — the cookie is auto-expired
and the login page loads normally. If you still see it:

1. Open browser DevTools → Application → Cookies → delete the `SESSION` cookie.
2. Hard-refresh the page.

### `Error: Unable to access jarfile target\login-app.jar`

You are running `java -jar target\login-app.jar` from the wrong directory.
Either `cd backend` first, or use the absolute path:
```powershell
java -jar C:\AIGenXLab\Projects\Login-app\backend\target\login-app.jar ...
```

### `{"code":"NOT_FOUND","message":"No static resource ."}` on `/`

This should no longer happen — `pom.xml` has a fail-fast guard that aborts
the build with `BUILD ABORTED: Vite output is missing` if `index.html` is not
in `target/classes/static/` before packaging. If you ever see `NOT_FOUND` at
runtime, you are running an old JAR — rebuild with `mvnw clean package` and
restart.

To manually verify the JAR's contents:

```powershell
Add-Type -Assembly System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead("C:\AIGenXLab\Projects\Login-app\backend\target\login-app.jar")
$zip.Entries | Where-Object { $_.FullName -match "static/index\.html" } | ForEach-Object { $_.FullName }
$zip.Dispose()
```

Must output `BOOT-INF/classes/static/index.html`.

### `BUILD ABORTED: Vite output is missing`

The fail-fast guard fired. Common causes (also listed in the build error):

1. **Vite build silently failed** — check for TypeScript errors:
   ```powershell
   cd frontend
   npx tsc --noEmit
   ```
2. **`vite.config.ts` outDir is wrong** — it must be
   `'../backend/src/main/resources/static'`, never `'dist'`.
3. **Filesystem race** (rare) — just re-run `mvnw clean package`.

### `Schema "public" has version N, but no migration could be resolved`

The Flyway SQL files aren't in the JAR. This usually means a custom
`maven-resources-plugin` execution was added to `pom.xml` and is interfering
with the default resource processing. Remove any custom `copy-resources`
execution — Vite should write to `static/` directly and Maven's default
`process-resources` handles everything else.

### Java version mismatch

```
UnsupportedClassVersionError
```
The JAR requires Java 21. Check: `java -version`
Install Java 21 LTS from [Eclipse Temurin](https://adoptium.net/).

### Node version mismatch

Vite 5 requires Node 18+. Check: `node --version`
Install Node 20 LTS from [nodejs.org](https://nodejs.org/).

### `mvnw.cmd` not found

```powershell
# From backend/ directory
Get-ChildItem mvnw.cmd
```
If missing, regenerate:
```powershell
cd backend
mvn -N wrapper:wrapper -Dmaven=3.9.15
```

### TypeScript errors on `npm run build`

```powershell
cd frontend
node node_modules\typescript\bin\tsc --noEmit
```
TypeScript errors will fail the Maven build. Fix all type errors before running
`mvnw clean package`.
