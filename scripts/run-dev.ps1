#Requires -Version 5.1
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path $PSScriptRoot -Parent
$PidsDir  = "$PSScriptRoot\.pids"
$LogsDir  = "$PSScriptRoot\logs"

function Import-DotEnv {
    $envFile = "$RepoRoot\.env"
    if (-not (Test-Path $envFile)) {
        Write-Warning ".env not found at repo root. Required env vars must already be set in your shell."
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
        Write-Host "       Run  .\scripts\stop-dev.ps1  or stop the process manually." -ForegroundColor Yellow
        exit 1
    }
}

function Stop-ProcessTree([int]$processId) {
    $children = Get-CimInstance Win32_Process -Filter "ParentProcessId = $processId" -ErrorAction SilentlyContinue
    foreach ($child in $children) { Stop-ProcessTree -processId $child.ProcessId }
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "Login App - Dev Mode" -ForegroundColor Cyan
Write-Host "--------------------" -ForegroundColor DarkGray

Assert-DirExists "$RepoRoot\backend"  "backend"
Assert-DirExists "$RepoRoot\frontend" "frontend"

Import-DotEnv

Assert-PortFree 8080
Assert-PortFree 5173

New-Item -ItemType Directory -Force -Path $PidsDir | Out-Null
New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null

if (-not (Test-Path "$RepoRoot\frontend\node_modules")) {
    Write-Host "  Installing frontend dependencies (first run)..." -ForegroundColor Yellow
    Push-Location "$RepoRoot\frontend"
    try {
        npm install
        if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: npm install failed." -ForegroundColor Red; exit 1 }
    } finally { Pop-Location }
}

Write-Host "  Starting backend (Spring Boot :8080)..." -ForegroundColor Green

$backendLog = "$LogsDir\backend.log"
'' | Set-Content $backendLog

$eBkDir = "$RepoRoot\backend".Replace("'", "''")
$eBkLog = $backendLog.Replace("'", "''")
$bkCmd  = "Set-Location '$eBkDir'; .\mvnw.cmd spring-boot:run '-Dspring-boot.run.profiles=local' *>> '$eBkLog'"

$backendProc = Start-Process powershell.exe `
    -ArgumentList "-NoProfile", "-NonInteractive", "-Command", $bkCmd `
    -PassThru -WindowStyle Hidden

$backendProc.Id | Set-Content "$PidsDir\backend.pid"
Write-Host "    PID $($backendProc.Id)  ->  logs: scripts\logs\backend.log"

Write-Host "  Starting frontend (Vite :5173)..." -ForegroundColor Green

$frontendLog = "$LogsDir\frontend.log"
'' | Set-Content $frontendLog

$eFtDir = "$RepoRoot\frontend".Replace("'", "''")
$eFtLog = $frontendLog.Replace("'", "''")
$ftCmd  = "Set-Location '$eFtDir'; npm run dev *>> '$eFtLog'"

$frontendProc = Start-Process powershell.exe `
    -ArgumentList "-NoProfile", "-NonInteractive", "-Command", $ftCmd `
    -PassThru -WindowStyle Hidden

$frontendProc.Id | Set-Content "$PidsDir\frontend.pid"
Write-Host "    PID $($frontendProc.Id)  ->  logs: scripts\logs\frontend.log"

Write-Host ""
Write-Host "  Frontend:  http://localhost:5173" -ForegroundColor Cyan
Write-Host "  Backend:   http://localhost:8080" -ForegroundColor Cyan
Write-Host "  Swagger:   http://localhost:8080/swagger-ui" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Spring Boot takes ~30 s to start. Watch the log:" -ForegroundColor Yellow
Write-Host "    Get-Content scripts\logs\backend.log -Wait" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Press Ctrl+C to stop both processes." -ForegroundColor Yellow
Write-Host ""

try {
    while ($true) {
        Start-Sleep -Seconds 2
        $bkAlive = -not $backendProc.HasExited
        $ftAlive = -not $frontendProc.HasExited
        if (-not $bkAlive -and -not $ftAlive) {
            Write-Host "Both processes exited unexpectedly. Check scripts\logs\." -ForegroundColor Red; break
        }
        if (-not $bkAlive) {
            Write-Host "Backend exited unexpectedly. Check scripts\logs\backend.log" -ForegroundColor Red; break
        }
        if (-not $ftAlive) {
            Write-Host "Frontend exited unexpectedly. Check scripts\logs\frontend.log" -ForegroundColor Red; break
        }
    }
} finally {
    Write-Host ""
    Write-Host "Stopping dev processes..." -ForegroundColor Yellow
    & "$PSScriptRoot\stop-dev.ps1"
}
