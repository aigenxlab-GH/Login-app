# Local Run Guide

Two modes for running the Login App locally on Windows.
Both require a `.env` file (or equivalent environment variables) at the repo root.

---

## 1. Create Your `.env` File (required for both modes)

```powershell
# From repo root
Copy-Item .env.example .env
# Then edit .env with your Supabase credentials
```

Minimum required variables:

```
SPRING_PROFILES_ACTIVE=local
DATABASE_URL=jdbc:postgresql://<host>:6543/postgres?sslmode=require
DATABASE_USERNAME=postgres.<project-ref>
DATABASE_PASSWORD=<your-db-password>
AUTH_PASSWORD_PEPPER=<long-random-string>
```

Get the JDBC URL from:
**Supabase Dashboard → Project → Settings → Database → Connection string → URI → JDBC**

Generate a pepper: `openssl rand -hex 32` (or any long random string).

---

## Mode A — Dev Mode (hot reload)

Two processes, two ports. Changes to frontend or backend code are reflected
without rebuilding.

```powershell
.\scripts\run-dev.ps1
```

| Process | Port | Notes |
|---------|------|-------|
| Spring Boot (backend) | 8080 | Auto-reloads with DevTools |
| Vite dev server (frontend) | 5173 | HMR; `/api` proxied to :8080 |

**Open:** http://localhost:5173

The script keeps both processes running. Press **Ctrl+C** to stop both.

### What the script does

1. Validates `backend/` and `frontend/` directories exist.
2. Loads `.env` from repo root (warns if missing, does not fail).
3. Checks ports 8080 and 5173 are free; exits with the owning process name if not.
4. Installs frontend deps (`npm install`) if `node_modules/` is missing.
5. Starts Spring Boot: `.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local`
6. Starts Vite: `npm run dev`
7. Saves PIDs to `scripts\.pids\backend.pid` and `scripts\.pids\frontend.pid`.
8. Writes logs to `scripts\logs\backend.log` and `scripts\logs\frontend.log`.
9. On Ctrl+C: calls `stop-dev.ps1` to stop both processes.

### Useful commands while dev mode is running

```powershell
# Tail the backend log (Spring Boot startup takes ~30 s)
Get-Content scripts\logs\backend.log -Wait

# Check process status and ports
.\scripts\status-local.ps1

# Stop without Ctrl+C (e.g., from another terminal)
.\scripts\stop-dev.ps1
```

### Manual alternative (two separate terminals)

```powershell
# Terminal 1 — backend
$env:SPRING_PROFILES_ACTIVE = 'local'
# (set other env vars or rely on .env loaded by a parent shell)
cd backend
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local

# Terminal 2 — frontend
cd frontend
npm install   # first time only
npm run dev
```

---

## Mode B — Prod-Mode Local Test (single JAR)

One process, one port, same as production. Maven builds the React app inside
the JAR during the build.

```powershell
.\scripts\run-prod-local.ps1
```

**Open:** http://localhost:8080

- The UI (`/`) and the API (`/api/**`) are served from the same origin.
- No Vite, no proxy — exactly what would run in production.
- Press **Ctrl+C** to stop.

### What the script does

1. Validates directories and loads `.env`.
2. Checks port 8080 is free.
3. Runs `.\mvnw.cmd clean package` in `backend\`:
   - `maven-clean-plugin` wipes `backend\src\main\resources\static\`
   - `frontend-maven-plugin` runs `npm install` + `npm run build`
   - Vite writes output to `frontend\dist\`
   - `maven-resources-plugin` copies `frontend\dist\` → `src\main\resources\static\`
   - `spring-boot:repackage` produces `backend\target\login-app.jar`
4. On build failure: prints error and exits 1.
5. On success: runs `java -jar backend\target\login-app.jar`.

### Skip the build (if JAR already exists)

```powershell
.\scripts\run-prod-local.ps1 -SkipBuild
```

### Manual alternative

```powershell
# From repo root — PowerShell
$env:DATABASE_URL           = 'jdbc:postgresql://...'
$env:DATABASE_USERNAME      = 'postgres.<ref>'
$env:DATABASE_PASSWORD      = '<password>'
$env:AUTH_PASSWORD_PEPPER   = '<pepper>'
$env:SPRING_PROFILES_ACTIVE = 'prod'

cd backend
.\mvnw.cmd clean package
java -jar target\login-app.jar
```

---

## Checking Status

```powershell
.\scripts\status-local.ps1
```

Shows:
- Whether backend/frontend PIDs from `.pids/` are running.
- Which processes are listening on ports 8080 and 5173.
- Log file paths and sizes.

---

## Troubleshooting

### "Port 8080 is already in use"

```powershell
# Find the process
Get-NetTCPConnection -LocalPort 8080 -State Listen
# Stop dev processes
.\scripts\stop-dev.ps1
# Or kill manually
Stop-Process -Id <PID> -Force
```

### "Port 5173 is already in use"

```powershell
.\scripts\stop-dev.ps1
# or
Get-NetTCPConnection -LocalPort 5173 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

### Spring Boot fails to start — database errors

```
Could not resolve placeholder 'DATABASE_URL'
```
The `.env` file is missing or a required variable is empty.
Check `.env.example` for all required variables.

```
Connection refused / FATAL: password authentication failed
```
The Supabase credentials are wrong.
Re-check **Supabase Dashboard → Settings → Database → Connection string → JDBC**.
Make sure you're using the **connection pooler** URL (port 6543) not the direct connection (port 5432) unless you have IPv6 on the pooler.

```
Flyway: Unable to obtain connection
```
Same cause as above, or the Supabase project is paused (free tier pauses after inactivity).
Restore it in the Supabase Dashboard.

### Spring Boot fails to start — AUTH_PASSWORD_PEPPER not set

```
Could not resolve placeholder 'AUTH_PASSWORD_PEPPER'
```
Add `AUTH_PASSWORD_PEPPER=<long-random-string>` to your `.env` file.
Generate one: `openssl rand -hex 32`

### Java version mismatch

```
UnsupportedClassVersionError
```
The JAR was compiled for Java 17. Check: `java -version`
Install Java 17+ (LTS). On Windows, [Eclipse Temurin](https://adoptium.net/) or `winget install EclipseAdoptium.Temurin.17.JDK`.

### Node version mismatch

Vite 5 requires Node 18+. Check: `node --version`
Install Node 20 LTS from [nodejs.org](https://nodejs.org/) or use `nvm-windows`.

### `mvnw.cmd` not found

```powershell
# From backend/ directory
Get-ChildItem mvnw.cmd
```
If missing, the Maven wrapper was not committed. Regenerate it:
```powershell
cd backend
mvn -N wrapper:wrapper -Dmaven=3.9.15
```

### Frontend HMR not working in dev mode

Vite requires the backend to be running before the frontend can make API calls.
Wait ~30 s for Spring Boot to print `Started LoginAppApplication`.

### TypeScript errors on `npm run build`

Run `cd frontend && node node_modules\typescript\bin\tsc --noEmit` to see all errors.
The Maven build runs `tsc -b` before `vite build`; TypeScript errors fail the Maven build.

---

## Log Files

| File | Content |
|------|---------|
| `scripts\logs\backend.log` | Spring Boot stdout + stderr |
| `scripts\logs\frontend.log` | Vite dev server stdout + stderr |

These are overwritten on each `run-dev.ps1` invocation and are gitignored.
