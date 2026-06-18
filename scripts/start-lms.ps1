$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$frontendRoot = Join-Path $repoRoot "frontend"
$logRoot = Join-Path $repoRoot ".logs"
$backendOutLog = Join-Path $logRoot "backend.out.log"
$backendErrLog = Join-Path $logRoot "backend.err.log"
$frontendOutLog = Join-Path $logRoot "frontend.out.log"
$frontendErrLog = Join-Path $logRoot "frontend.err.log"

New-Item -ItemType Directory -Path $logRoot -Force | Out-Null

function Start-LmsBackend {
    param(
        [int] $Attempt
    )

    if ($Attempt -gt 1) {
        Write-Output "Retrying LMS backend startup (attempt $Attempt)..."
    }

    Start-Process powershell.exe `
        -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $PSScriptRoot "start-backend.ps1")) `
        -WorkingDirectory $repoRoot `
        -RedirectStandardOutput $backendOutLog `
        -RedirectStandardError $backendErrLog `
        -WindowStyle Hidden `
        -PassThru
}

$frontendProcesses = Get-CimInstance Win32_Process |
    Where-Object {
        $_.Name -eq "node.exe" -and
        $_.CommandLine -and
        $_.CommandLine.IndexOf($frontendRoot, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
    }

foreach ($process in $frontendProcesses) {
    Stop-Process -Id $process.ProcessId -Force
}

$backendAttempt = 1
$maxBackendAttempts = 2
$backendProcess = Start-LmsBackend -Attempt $backendAttempt

Start-Process cmd.exe `
    -ArgumentList @("/c", "npm.cmd run dev -- --host 127.0.0.1") `
    -WorkingDirectory $frontendRoot `
    -RedirectStandardOutput $frontendOutLog `
    -RedirectStandardError $frontendErrLog `
    -WindowStyle Hidden

$deadline = (Get-Date).AddSeconds(60)
do {
    Start-Sleep -Milliseconds 500
    $backendReady = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
    $frontendReady = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue

    if (-not $backendReady -and $backendProcess.HasExited -and $backendAttempt -lt $maxBackendAttempts) {
        $backendAttempt++
        Start-Sleep -Seconds 2
        $backendProcess = Start-LmsBackend -Attempt $backendAttempt
    }
} until (($backendReady -and $frontendReady) -or (Get-Date) -ge $deadline)

if (-not $backendReady -or -not $frontendReady) {
    throw "LMS did not start completely. Backend ready: $([bool]$backendReady). Frontend ready: $([bool]$frontendReady). Check logs in $logRoot."
}

Write-Output "LMS is running:"
Write-Output "  Frontend: http://localhost:5173"
Write-Output "  Backend:  http://localhost:5000"
