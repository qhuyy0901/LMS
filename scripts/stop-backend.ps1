$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $repoRoot "backend-dotnet"

$runningInstances = Get-CimInstance Win32_Process |
    Where-Object {
        $_.Name -eq "LMS.Api.exe" -and
        $_.ExecutablePath -and
        $_.ExecutablePath.StartsWith($backendRoot, [System.StringComparison]::OrdinalIgnoreCase)
    }

if (-not $runningInstances) {
    Write-Host "LMS backend is not running."
    exit 0
}

foreach ($instance in $runningInstances) {
    Stop-Process -Id $instance.ProcessId -Force
    Write-Host "Stopped LMS backend (PID $($instance.ProcessId))."
}
