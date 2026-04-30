#Requires -Version 5.1
param(
    [switch]$SkipBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot   = Split-Path $PSScriptRoot -Parent
$BackendDir = "$RepoRoot\backend"
$JarPath    = "$BackendDir\target\login-app.jar"

function Import-DotEnv {
    $envFile = "$RepoRoot\.env"
    if (-not (Test-Path $envFile)) {
        Write-Warning ".env not found at repo root. DATABASE_URL, DATABASE_USERNAME, DATABASE_PASSWORD and AUTH_PASSWORD_PEPPER must be set in your shell before running this script."
        return
    }
    Write-Host "  Loading $envFile" -ForegroundColor DarkGray
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -eq '' -or $line.StartsWith('#')) { return }
        $idx = $line.IndexOf('=')
        if ($idx -lt 1) { return }
        $key = $line.Substring(0, $idx).Trim()
        $val = $line.Substring($idx + 1).Trim()
        if (($val.StartsWith('"') -and $val.EndsWith('"')) -or
            ($val.StartsWith("'") -and $val.EndsWith("'"))) {
            $val = $val.Substring(1, $val.Length - 2)
        }
        [System.Environment]::SetEnvironmentVariable($key, $val, 'Process')
        Set-Item -Path "Env:$key" -Value $val -ErrorAction SilentlyContinue
    }
}

function Assert-DirExists([string]$path, [string]$label) {
    if (-not (Test-Path $path -PathType Container)) {
        Write-Host "ERROR: $label directory not found: $path" -ForegroundColor Red
        exit 1
    }
}

function Assert-PortFree([int]$port) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
            Select-Object -First 1
    if ($null -ne $conn) {
        $pname = try { (Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue).ProcessName } catch { 'unknown' }
        Write-Host "ERROR: Port $port is already in use by '$pname' (PID $($conn.OwningProcess))." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Login App - Prod-Mode Local Test" -ForegroundColor Cyan
Write-Host "--------------------------------" -ForegroundColor DarkGray

Assert-DirExists $BackendDir        "backend"
Assert-DirExists "$RepoRoot\frontend" "frontend"

Import-DotEnv
Assert-PortFree 8080

if ($SkipBuild -and (Test-Path $JarPath)) {
    Write-Host "  Skipping build (-SkipBuild). Using existing JAR." -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "  Building single JAR (React + Spring Boot)..." -ForegroundColor Green
    Write-Host "  This installs npm deps, runs Vite, compiles Java, and packages the JAR."
    Write-Host "  First run takes 3-5 min. Subsequent runs: ~30 s." -ForegroundColor DarkGray
    Write-Host ""

    Push-Location $BackendDir
    try {
        & ".\mvnw.cmd" "clean", "package"
        if ($LASTEXITCODE -ne 0) {
            Write-Host ""
            Write-Host "ERROR: Maven build failed (exit code $LASTEXITCODE)." -ForegroundColor Red
            Write-Host "       Check the output above for compiler or test errors." -ForegroundColor Yellow
            exit 1
        }
    } finally {
        Pop-Location
    }

    Write-Host ""
    Write-Host "  Build successful." -ForegroundColor Green
}

if (-not (Test-Path $JarPath)) {
    Write-Host "ERROR: JAR not found at $JarPath" -ForegroundColor Red
    exit 1
}

$jarSize = [math]::Round((Get-Item $JarPath).Length / 1MB, 1)
Write-Host "  JAR: $JarPath  ($jarSize MB)" -ForegroundColor DarkGray

Write-Host ""
Write-Host "  App (UI + API):  http://localhost:8080" -ForegroundColor Cyan
Write-Host "  Swagger:         http://localhost:8080/swagger-ui" -ForegroundColor Cyan
Write-Host "  Health:          http://localhost:8080/actuator/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "  This is the SAME JAR that would deploy to production." -ForegroundColor DarkGray
Write-Host "  Press Ctrl+C to stop." -ForegroundColor Yellow
Write-Host ""

& java "-jar" $JarPath

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Java process exited with code $LASTEXITCODE." -ForegroundColor Red
    Write-Host "Common causes:" -ForegroundColor Yellow
    Write-Host "  - DATABASE_URL / DATABASE_USERNAME / DATABASE_PASSWORD not set" -ForegroundColor Yellow
    Write-Host "  - AUTH_PASSWORD_PEPPER not set" -ForegroundColor Yellow
    Write-Host "  - Supabase DB unreachable (check network / VPN)" -ForegroundColor Yellow
    Write-Host "  - Port 8080 taken by another process" -ForegroundColor Yellow
    exit $LASTEXITCODE
}
