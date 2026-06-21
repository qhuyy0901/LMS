# restart-backend.ps1
# Kill anything running on port 5000, wait for TIME_WAIT to clear, then start fresh

Write-Host "Stopping any process on port 5000..." -ForegroundColor Yellow
$connections = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
$pids = $connections | Where-Object { $_.OwningProcess -ne 0 } |
        Select-Object -ExpandProperty OwningProcess -Unique
if ($pids) {
    $pids | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
    Write-Host "Killed PID(s): $($pids -join ', ')" -ForegroundColor Green
}

# Wait for TIME_WAIT sockets to clear
$maxWait = 60
$waited = 0
while ($waited -lt $maxWait) {
    $tw = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue |
          Where-Object { $_.State -eq 'TimeWait' -or $_.State -eq 'Listen' }
    if (-not $tw) { break }
    if ($waited -eq 0) {
        Write-Host "Waiting for port 5000 to fully release (TIME_WAIT)..." -ForegroundColor Yellow
    }
    Start-Sleep -Seconds 2
    $waited += 2
    Write-Host "  Waited ${waited}s..." -ForegroundColor DarkGray
}

if ($waited -ge $maxWait) {
    Write-Host "Warning: Port 5000 may still be in use after ${maxWait}s" -ForegroundColor Red
} else {
    Write-Host "Port 5000 is free." -ForegroundColor Green
}

Write-Host "Starting backend..." -ForegroundColor Cyan
dotnet run --project backend-dotnet/LMS.Api.csproj --urls http://localhost:5000
