<#
.SYNOPSIS
  Stop the Fardeen native dev stack started by dev-up.ps1.

.DESCRIPTION
  dev-up.ps1 normally stops everything itself on Ctrl+C / terminal close (its children are in a
  KILL_ON_JOB_CLOSE job object). Use this only to clean up after a terminal was hard-killed and left
  orphans: it kills the tracked PIDs (.dev-pids) and frees every stack port. Leaves native
  Postgres/Redis running (those are shared infra).
#>
$ErrorActionPreference = 'SilentlyContinue'
$root = $PSScriptRoot
$pidFile = Join-Path $root '.dev-pids'
$ports = @(3000, 4000, 3010, 4010, 3011, 4011, 3012, 4012, 3013, 4013, 3014, 4014, 3015, 4015, 3016, 4016, 3017, 4017, 3018, 4018)

$killed = 0
if (Test-Path $pidFile) {
  foreach ($line in Get-Content $pidFile) {
    if ($line -match '^\d+$') {
      $p = Get-Process -Id ([int]$line) -ErrorAction SilentlyContinue
      if ($p) { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue; $killed++ }
    }
  }
  Remove-Item $pidFile -ErrorAction SilentlyContinue
}

# Free every stack port (kills any lingering listener — orphaned node from a hard-closed terminal).
foreach ($port in $ports) {
  Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}

Write-Host "Fardeen dev stack stopped ($killed tracked process(es) killed; ports freed). Postgres/Redis left running." -ForegroundColor Yellow
