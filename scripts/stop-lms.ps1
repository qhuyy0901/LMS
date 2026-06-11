$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$frontendRoot = Join-Path $repoRoot "frontend"

& (Join-Path $PSScriptRoot "stop-backend.ps1")

$frontendProcesses = Get-CimInstance Win32_Process |
    Where-Object {
        $_.Name -eq "node.exe" -and
        $_.CommandLine -and
        $_.CommandLine.IndexOf($frontendRoot, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
    }

foreach ($process in $frontendProcesses) {
    Stop-Process -Id $process.ProcessId -Force
    Write-Host "Stopped LMS frontend (PID $($process.ProcessId))."
}
