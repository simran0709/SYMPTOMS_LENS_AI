@echo off
setlocal
cd /d "%~dp0frontend\simple-project"
call npm.cmd install --legacy-peer-deps
call npm.cmd run dev
