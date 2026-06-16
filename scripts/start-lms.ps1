$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$frontendRoot = Join-Path $repoRoot "frontend"
$logRoot = Join-Path $repoRoot ".logs"

New-Item -ItemType Directory -Path $logRoot -Force | Out-Null

$frontendProcesses = Get-CimInstance Win32_Process |
    Where-Object {
        $_.Name -eq "node.exe" -and
        $_.CommandLine -and
        $_.CommandLine.IndexOf($frontendRoot, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
    }

foreach ($process in $frontendProcesses) {
    Stop-Process -Id $process.ProcessId -Force
}

Start-Process powershell.exe `
    -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $PSScriptRoot "start-backend.ps1")) `
    -WorkingDirectory $repoRoot `
    -RedirectStandardOutput (Join-Path $logRoot "backend.out.log") `
    -RedirectStandardError (Join-Path $logRoot "backend.err.log") `
    -WindowStyle Hidden

Start-Process cmd.exe `
    -ArgumentList @("/c", "npm.cmd run dev -- --host 127.0.0.1") `
    -WorkingDirectory $frontendRoot `
    -RedirectStandardOutput (Join-Path $logRoot "frontend.out.log") `
    -RedirectStandardError (Join-Path $logRoot "frontend.err.log") `
    -WindowStyle Hidden

$deadline = (Get-Date).AddSeconds(60)
do {
    Start-Sleep -Milliseconds 500
    $backendReady = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
    $frontendReady = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
} until (($backendReady -and $frontendReady) -or (Get-Date) -ge $deadline)

if (-not $backendReady -or -not $frontendReady) {
    throw "LMS did not start completely. Check logs in $logRoot."
}

Write-Host "LMS is running:"
Write-Host "  Frontend: http://localhost:5173"
Write-Host "  Backend:  http://localhost:5000"
