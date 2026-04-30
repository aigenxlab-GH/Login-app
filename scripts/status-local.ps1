#Requires -Version 5.1
param()

$ErrorActionPreference = "SilentlyContinue"

$PidsDir       = "$PSScriptRoot\.pids"
$BackendPort   = 8080
$FrontendPort  = 5173

function Get-ProcessStatus([string]$pidFile, [string]$label) {
    $pidPath = "$PidsDir\$pidFile"
    if (-not (Test-Path $pidPath)) {
        Write-Host "  $label  ->  not running (no PID file)" -ForegroundColor DarkGray
        return
    }
    $savedPid = [int](Get-Content $pidPath -Raw).Trim()
    $proc = Get-Process -Id $savedPid -ErrorAction SilentlyContinue
    if ($null -ne $proc) {
        $cpu  = [math]::Round($proc.CPU, 1)
        $mem  = [math]::Round($proc.WorkingSet64 / 1MB, 0)
        Write-Host "  $label  ->  running  (PID $savedPid, CPU ${cpu}s, Mem ${mem} MB)" -ForegroundColor Green
    } else {
        Write-Host "  $label  ->  DEAD     (PID $savedPid no longer exists - run stop-dev.ps1 to clean up)" -ForegroundColor Red
    }
}

function Get-PortStatus([int]$port, [string]$label) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
            Select-Object -First 1
    if ($null -ne $conn) {
        $pname = try { (Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue).ProcessName } catch { 'unknown' }
        Write-Host "  :$port  ($label)  ->  LISTENING  ($pname, PID $($conn.OwningProcess))" -ForegroundColor Green
    } else {
        Write-Host "  :$port  ($label)  ->  free" -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "Login App - Local Status" -ForegroundColor Cyan
Write-Host "------------------------" -ForegroundColor DarkGray
Write-Host ""

Write-Host "Processes (from PID files):" -ForegroundColor White
Get-ProcessStatus "backend.pid"  "Backend  (Spring Boot)"
Get-ProcessStatus "frontend.pid" "Frontend (Vite)        "

Write-Host ""
Write-Host "Ports:" -ForegroundColor White
Get-PortStatus $BackendPort  "backend / prod-mode"
Get-PortStatus $FrontendPort "frontend dev server"

Write-Host ""
Write-Host "Logs:" -ForegroundColor White
$logsDir = "$PSScriptRoot\logs"
foreach ($logName in @("backend.log", "frontend.log")) {
    $logPath = "$logsDir\$logName"
    if (Test-Path $logPath) {
        $size = [math]::Round((Get-Item $logPath).Length / 1KB, 0)
        Write-Host "  $logPath  (${size} KB)" -ForegroundColor DarkGray
    } else {
        Write-Host "  $logPath  - not found" -ForegroundColor DarkGray
    }
}

Write-Host ""
