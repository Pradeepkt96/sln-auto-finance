# Script to start local MongoDB, Backend, Frontend, and Tailwind in the same terminal

$mongodExe = "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe"
$mongoPaths = @("C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe")

if ($env:MONGODB_PATH -and (Test-Path $env:MONGODB_PATH)) {
    $mongodExe = $env:MONGODB_PATH
}

if (-not (Test-Path $mongodExe)) {
    foreach ($path in $mongoPaths) {
        if (Test-Path $path) {
            $mongodExe = $path
            break
        }
    }
}

$backendDir = Split-Path $PSScriptRoot -Parent
$rootDir = Split-Path $backendDir -Parent
$frontendDir = Join-Path $rootDir "frontend"

$runningProcesses = @()

Write-Host "Press Ctrl+C at any time to kill all background services." -ForegroundColor Yellow

try {
    if (-not (Test-Path $mongodExe)) {
        Write-Host "Error: mongod.exe not found." -ForegroundColor Red
    }
    else {
        $dataDir = Join-Path $PSScriptRoot "freshdb"
        if (-not (Test-Path $dataDir)) {
            New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
            Write-Host "Created data directory at $dataDir" -ForegroundColor Green
        }

        # Kill any orphaned mongod processes and remove lock file to prevent DBPathInUse error
        $orphanedMongo = Get-Process mongod -ErrorAction SilentlyContinue
        if ($orphanedMongo) {
            Write-Host "Killing orphaned mongod processes..." -ForegroundColor Yellow
            $orphanedMongo | Stop-Process -Force -ErrorAction SilentlyContinue
        }
        $lockFile = Join-Path $dataDir "mongod.lock"
        if (Test-Path $lockFile) {
            Remove-Item $lockFile -Force -ErrorAction SilentlyContinue
        }

        Write-Host "Starting MongoDB in background on port 27018..." -ForegroundColor Cyan
        $runningProcesses += Start-Process -FilePath $mongodExe -ArgumentList "--dbpath `"$dataDir`" --port 27018 --bind_ip 127.0.0.1" -NoNewWindow -PassThru
    }

    Write-Host "Starting Backend in background..." -ForegroundColor Cyan
    if (Test-Path $backendDir) {
        $runningProcesses += Start-Process -FilePath "node.exe" -ArgumentList "server.js" -WorkingDirectory $backendDir -NoNewWindow -PassThru
    }

    Write-Host "Starting Frontend and Tailwind in background..." -ForegroundColor Cyan
    if (Test-Path $frontendDir) {
        if (Test-Path (Join-Path $frontendDir "package.json")) {
            $runningProcesses += Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" -WorkingDirectory $frontendDir -NoNewWindow -PassThru
        }
        else {
            Write-Host "Warning: frontend/package.json not found, skipping 'npm run dev' for frontend." -ForegroundColor Yellow
        }

        $cssPath = Join-Path $frontendDir "src\index.css"
        if (Test-Path $cssPath) {
            $runningProcesses += Start-Process -FilePath "npx.cmd" -ArgumentList "--yes", "tailwindcss@3", "-i", "./src/index.css", "-o", "./src/output.css", "--watch" -WorkingDirectory $frontendDir -NoNewWindow -PassThru
        }
        else {
            Write-Host "Warning: frontend/src/index.css not found, skipping tailwind compiler." -ForegroundColor Yellow
        }
    }

    Write-Host "`nAll processes started in this terminal. Output is interleaved.`nKeep this script running..." -ForegroundColor Yellow

    # Keep script alive to hold the terminal.
    # Note: If Ctrl+C is pressed, the finally block will attempt to kill the child processes.
    while ($true) {
        Start-Sleep -Seconds 1
    }

}
finally {
    Write-Host "`nStopping all processes..." -ForegroundColor Yellow
    foreach ($p in $runningProcesses) {
        if ($p -and -not $p.HasExited) {
            Write-Host "Killing Process ID: $($p.Id)"
            Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
        }
    }
}