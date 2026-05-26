$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot

function Start-DevProcess {
  param (
    [string] $Name,
    [string[]] $ArgumentList
  )

  Write-Host "Starting $Name..."

  Start-Process `
    -FilePath 'npm.cmd' `
    -ArgumentList $ArgumentList `
    -WorkingDirectory $root `
    -NoNewWindow `
    -PassThru
}

function Stop-ProcessTree {
  param (
    [int] $ProcessId
  )

  $children = Get-CimInstance Win32_Process -Filter "ParentProcessId = $ProcessId" -ErrorAction SilentlyContinue

  foreach ($child in $children) {
    Stop-ProcessTree -ProcessId $child.ProcessId
  }

  Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
}

$backend = Start-DevProcess -Name 'backend' -ArgumentList @('run', 'dev:backend')
$frontend = Start-DevProcess -Name 'frontend' -ArgumentList @('run', 'dev:frontend')
$processes = @($backend, $frontend)

try {
  Write-Host ''
  Write-Host 'Local dev is starting:'
  Write-Host '- Backend:  http://localhost:3000'
  Write-Host '- Frontend: http://localhost:5173'
  Write-Host ''
  Write-Host 'Press Ctrl+C to stop both processes.'

  while ($true) {
    $running = $processes | Where-Object { -not $_.HasExited }

    if ($running.Count -eq 0) {
      break
    }

    Start-Sleep -Seconds 1
  }
}
finally {
  foreach ($process in $processes) {
    if ($process -and -not $process.HasExited) {
      Write-Host "Stopping process $($process.Id)..."
      Stop-ProcessTree -ProcessId $process.Id
    }
  }
}
