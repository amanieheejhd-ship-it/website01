<#
.SYNOPSIS
  Fardeen "Light dev mode" - start the WHOLE native stack and hold it live in this terminal.

.DESCRIPTION
  Run this in a VS Code integrated terminal. It:
    1. ensures native Postgres 5432 + Redis 6379 are up (starts fardeen-dev-infra\start-infra.ps1 if not);
    2. builds workspace packages + services to dist if missing (so node dist/main.js runs lean);
    3. frees any stale ports (orphan node from a previously-closed terminal), then starts the 10
       compiled services + the frontend;
    4. holds the foreground, printing a status line + the URLs, and STAYS ALIVE until you press Ctrl+C
       or close the terminal. All child processes are placed in a Windows Job Object with
       KILL_ON_JOB_CLOSE, so they are terminated cleanly the moment this script/terminal exits.

  URLs:  site http://localhost:3000   admin http://localhost:3000/admin

.PARAMETER Prod
  Serve the frontend as a production build (next build once, then next start) instead of next dev.
  Recommended on low-memory machines (production server ~200MB vs ~1.2GB for the dev server).

.PARAMETER Rebuild
  Force-rebuild packages + all service dist before starting.
#>
[CmdletBinding()]
param(
  [switch]$Prod,
  [switch]$Rebuild
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
Set-Location $root
$logs = Join-Path $root '.dev-logs'
New-Item -ItemType Directory -Force -Path $logs | Out-Null
$pidFile = Join-Path $root '.dev-pids'

# Services (compiled dist) in start order: owning/leaf -> BFF -> gateway. name -> HTTP health port.
$services = @(
  @{ name = 'project-service';      port = 3012 },
  @{ name = 'service-management';   port = 3013 },
  @{ name = 'cms-service';          port = 3011 },
  @{ name = 'contact-service';      port = 3014 },
  @{ name = 'quotation-service';    port = 3015 },
  @{ name = 'media-service';        port = 3016 },
  @{ name = 'notification-service'; port = 3018 },
  @{ name = 'auth-service';         port = 3010 },
  @{ name = 'admin-service';        port = 3017 },
  @{ name = 'gateway';              port = 4000 }
)
$allPorts = @(3000, 4000, 3010, 4010, 3011, 4011, 3012, 4012, 3013, 4013, 3014, 4014, 3015, 4015, 3016, 4016, 3017, 4017, 3018, 4018)

# Windows Job Object: children die when THIS process (the terminal) closes, however it closes.
if (-not ('Win32Job' -as [type])) {
  Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32Job {
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr CreateJobObject(IntPtr a, string lpName);
  [DllImport("kernel32.dll")] public static extern bool SetInformationJobObject(IntPtr hJob, int c, IntPtr i, uint l);
  [DllImport("kernel32.dll", SetLastError=true)] public static extern bool AssignProcessToJobObject(IntPtr hJob, IntPtr hProcess);
  [StructLayout(LayoutKind.Sequential)] public struct BASIC { public Int64 a; public Int64 b; public UInt32 LimitFlags; public UIntPtr d; public UIntPtr e; public UInt32 f; public UIntPtr g; public UInt32 h; public UInt32 i; }
  [StructLayout(LayoutKind.Sequential)] public struct IOC { public UInt64 a,b,c,d,e,f; }
  [StructLayout(LayoutKind.Sequential)] public struct EXT { public BASIC Basic; public IOC Io; public UIntPtr a; public UIntPtr b; public UIntPtr c; public UIntPtr d; }
  public static IntPtr CreateKillOnClose() {
    IntPtr job = CreateJobObject(IntPtr.Zero, null);
    EXT ext = new EXT(); ext.Basic.LimitFlags = 0x2000;
    int len = Marshal.SizeOf(ext); IntPtr p = Marshal.AllocHGlobal(len);
    Marshal.StructureToPtr(ext, p, false);
    SetInformationJobObject(job, 9, p, (uint)len); Marshal.FreeHGlobal(p);
    return job;
  }
}
"@
}
$job = [Win32Job]::CreateKillOnClose()
$script:children = New-Object System.Collections.Generic.List[System.Diagnostics.Process]

function Start-Child([string]$file, [string[]]$argv, [string]$cwd, [string]$logName) {
  $p = Start-Process -FilePath $file -ArgumentList $argv -WorkingDirectory $cwd -PassThru -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $logs "$logName.out.log") -RedirectStandardError (Join-Path $logs "$logName.err.log")
  try { [Win32Job]::AssignProcessToJobObject($job, $p.Handle) | Out-Null } catch {}
  $script:children.Add($p)
  return $p
}

function Test-Port([int]$port) {
  try { (New-Object System.Net.Sockets.TcpClient).Connect('127.0.0.1', $port); return $true } catch { return $false }
}
function Test-Health([int]$port, [string]$path) {
  try { return (Invoke-WebRequest -Uri "http://localhost:$port$path" -TimeoutSec 2 -UseBasicParsing).StatusCode -ge 200 } catch { return $false }
}
function HealthPath([string]$name) { if ($name -eq 'gateway') { return '/api/v1/health' } else { return '/health' } }

function Stop-Stack {
  Write-Host ""
  Write-Host "  Shutting down the stack..." -ForegroundColor Yellow
  foreach ($c in $script:children) { try { if (-not $c.HasExited) { Stop-Process -Id $c.Id -Force -ErrorAction SilentlyContinue } } catch {} }
  Remove-Item $pidFile -ErrorAction SilentlyContinue
  Write-Host "  Stack stopped." -ForegroundColor Yellow
}

try {
  # 1. Infra
  Write-Host "[1/4] Native infra (Postgres 5432 + Redis 6379)..." -ForegroundColor Cyan
  if (-not (Test-Port 5432) -or -not (Test-Port 6379)) {
    & 'C:\Users\EARNINGFISH\fardeen-dev-infra\start-infra.ps1'
    $t = 0; while ((-not (Test-Port 5432) -or -not (Test-Port 6379)) -and $t -lt 20) { Start-Sleep 1; $t++ }
  }
  if (-not (Test-Port 5432) -or -not (Test-Port 6379)) { throw "Postgres/Redis did not come up." }
  Write-Host "      up." -ForegroundColor Green
  if (-not (Test-Port 9000)) {
    Write-Host "      note: MinIO (9000) is not running - media-service (uploads) will be unavailable; the rest of the stack is fine." -ForegroundColor Yellow
  }

  # 2. Build if stale
  $needBuild = $Rebuild -or -not (Test-Path (Join-Path $root 'packages\types\dist\index.js'))
  foreach ($s in $services) { if (-not (Test-Path (Join-Path $root "apps\$($s.name)\dist\main.js"))) { $needBuild = $true } }
  if ($needBuild) {
    Write-Host "[2/4] Building packages + services to dist (one-time)..." -ForegroundColor Cyan
    $projects = 'types,shared,utils,' + (($services | ForEach-Object { $_.name }) -join ',')
    & npx nx run-many -t build "--projects=$projects" --parallel=1 2>&1 | Out-Null
  } else {
    Write-Host "[2/4] dist present - skipping build (use -Rebuild to force)." -ForegroundColor Cyan
  }
  if ($Prod -and ($Rebuild -or -not (Test-Path (Join-Path $root 'apps\frontend\.next\BUILD_ID')))) {
    Write-Host "      building frontend (production)..." -ForegroundColor Cyan
    Push-Location (Join-Path $root 'apps\frontend'); & npx next build 2>&1 | Out-Null; Pop-Location
  }

  # 3. Free stale ports
  Write-Host "[3/4] Freeing stale ports..." -ForegroundColor Cyan
  foreach ($port in $allPorts) {
    try { Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } } catch {}
  }

  # 4. Start the stack
  Write-Host "[4/4] Starting 10 services + frontend..." -ForegroundColor Cyan
  foreach ($s in $services) {
    Start-Child 'node' @((Join-Path $root 'scripts\run-svc.cjs'), "apps\$($s.name)") $root $s.name | Out-Null
    Start-Sleep -Milliseconds 1500
  }
  if ($Prod) {
    Start-Child 'npx.cmd' @('next', 'start', '-p', '3000') (Join-Path $root 'apps\frontend') 'frontend' | Out-Null
  } else {
    Start-Child 'npx.cmd' @('next', 'dev', '-p', '3000') (Join-Path $root 'apps\frontend') 'frontend' | Out-Null
  }
  ($script:children | ForEach-Object { $_.Id }) -join "`n" | Set-Content $pidFile

  # Health gate
  Write-Host ""
  Write-Host "Waiting for the stack to become ready..." -ForegroundColor Cyan
  $deadline = (Get-Date).AddSeconds(180)
  while ((Get-Date) -lt $deadline) {
    $upSvc = ($services | Where-Object { Test-Health $_.port (HealthPath $_.name) }).Count
    $feUp = Test-Health 3000 '/'
    $feTxt = if ($feUp) { 'ready' } else { 'starting' }
    Write-Host ("  services {0}/10 | frontend {1}" -f $upSvc, $feTxt) -ForegroundColor DarkGray
    # Ready once the gateway (entry point) + frontend are up; media needs MinIO and may stay down.
    if ($feUp -and (Test-Health 4000 '/api/v1/health')) { break }
    Start-Sleep 5
  }
  $down = ($services | Where-Object { -not (Test-Health $_.port (HealthPath $_.name)) } | ForEach-Object { $_.name }) -join ', '
  if ($down) { Write-Host "  (down: $down)" -ForegroundColor Yellow }

  Write-Host ""
  Write-Host "  ================================================================" -ForegroundColor Green
  Write-Host "   Fardeen is LIVE - this terminal keeps it running." -ForegroundColor Green
  Write-Host "     Site   ->  http://localhost:3000" -ForegroundColor Green
  Write-Host "     Admin  ->  http://localhost:3000/admin" -ForegroundColor Green
  Write-Host "     API    ->  http://localhost:4000/api/v1" -ForegroundColor Green
  Write-Host "   Press Ctrl+C (or close this terminal) to stop everything." -ForegroundColor Green
  Write-Host "  ================================================================" -ForegroundColor Green

  # Foreground status loop - holds the terminal alive until Ctrl+C / close.
  while ($true) {
    Start-Sleep 10
    $upSvc = ($services | Where-Object { Test-Health $_.port (HealthPath $_.name) }).Count
    $feUp = Test-Health 3000 '/'
    $feTxt = if ($feUp) { 'ok' } else { 'down' }
    Write-Host ("  [{0}] services {1}/10 | frontend {2} | http://localhost:3000" -f (Get-Date -Format 'HH:mm:ss'), $upSvc, $feTxt) -ForegroundColor DarkGray
  }
}
finally {
  Stop-Stack
}
