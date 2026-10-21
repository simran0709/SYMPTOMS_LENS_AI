@echo off
setlocal
start "SymptomLens Backend" cmd /k call "%~dp0RUN_BACKEND.cmd"
start "SymptomLens Frontend" cmd /k call "%~dp0RUN_FRONTEND.cmd"
echo.
echo SymptomLens is starting in two windows.
echo Backend:  http://localhost:8000/docs
echo Frontend: http://localhost:5173/
pause
