$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $repoRoot "backend-dotnet"
$projectPath = Join-Path $backendRoot "LMS.Api.csproj"

$runningInstances = Get-CimInstance Win32_Process |
    Where-Object {
        $_.Name -eq "LMS.Api.exe" -and
        $_.ExecutablePath -and
        $_.ExecutablePath.StartsWith($backendRoot, [System.StringComparison]::OrdinalIgnoreCase)
    }

foreach ($instance in $runningInstances) {
    Write-Host "Stopping existing LMS backend (PID $($instance.ProcessId))..."
    Stop-Process -Id $instance.ProcessId -Force
}

if ($runningInstances) {
    Start-Sleep -Milliseconds 500
}

$portOwner = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1

if ($portOwner) {
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $($portOwner.OwningProcess)"
    throw "Port 5000 is being used by $($process.Name) (PID $($portOwner.OwningProcess)). Stop that application or use another port."
}

Set-Location $repoRoot
dotnet run --project $projectPath --urls http://localhost:5000
