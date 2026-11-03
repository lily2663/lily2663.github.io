@echo off
echo Stopping llama-server...
taskkill /F /IM llama-server.exe 2>nul
if errorlevel 1 (echo   [none running]) else (echo   [stopped])
timeout /t 2 >nul
