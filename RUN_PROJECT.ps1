$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend\simple-project"

Write-Host "SymptomLens AI Phase 2" -ForegroundColor Cyan
Write-Host "Starting backend and frontend in separate PowerShell windows..." -ForegroundColor Green

$backendCommand = "Set-Location '$backend'; Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass; if (!(Test-Path '.venv\Scripts\python.exe')) { python -m venv .venv }; .\.venv\Scripts\python.exe -m pip install -r requirements.txt; .\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000"
$frontendCommand = "Set-Location '$frontend'; npm.cmd install --legacy-peer-deps; npm.cmd run dev"

Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCommand
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCommand

Write-Host "Open the Vite localhost URL shown by the frontend terminal after startup." -ForegroundColor Yellow
Write-Host "Swagger: http://localhost:8000/docs" -ForegroundColor Yellow
