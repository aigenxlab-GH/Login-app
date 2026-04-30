#Requires -Version 5.1
param()

$ErrorActionPreference = "SilentlyContinue"

$PidsDir = "$PSScriptRoot\.pids"

function Stop-ProcessTree([int]$processId) {
    $children = Get-CimInstance Win32_Process `
        -Filter "ParentProcessId = $processId" `
        -ErrorAction SilentlyContinue
    foreach ($child in $children) {
        Stop-ProcessTree -processId $child.ProcessId
    }
    $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if ($null -ne $proc) {
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        return $true
    }
    return $false
}

function Stop-FromPidFile([string]$pidFile, [string]$label) {
    $pidPath = "$PidsDir\$pidFile"
    if (-not (Test-Path $pidPath)) {
        Write-Host "  $label  - no PID file (already stopped or never started)" -ForegroundColor DarkGray
        return
    }
    $savedPid = [int](Get-Content $pidPath -Raw).Trim()
    $stopped = Stop-ProcessTree -processId $savedPid
    if ($stopped) {
        Write-Host "  $label  - stopped (PID $savedPid)" -ForegroundColor Green
    } else {
        Write-Host "  $label  - was already stopped (PID $savedPid)" -ForegroundColor DarkGray
    }
    Remove-Item $pidPath -Force -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "Stopping dev processes..." -ForegroundColor Yellow

if (-not (Test-Path $PidsDir)) {
    Write-Host "  No .pids directory found - nothing to stop." -ForegroundColor DarkGray
    Write-Host ""
    exit 0
}

Stop-FromPidFile "backend.pid"  "Backend  (Spring Boot :8080)"
Stop-FromPidFile "frontend.pid" "Frontend (Vite :5173)"

$remaining = Get-ChildItem $PidsDir -ErrorAction SilentlyContinue
if ($null -eq $remaining -or $remaining.Count -eq 0) {
    Remove-Item $PidsDir -Force -Recurse -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "  Done. Ports 8080 and 5173 are now free." -ForegroundColor Cyan
Write-Host ""
