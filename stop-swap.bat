@echo off
echo Stopping llama-swap and all upstream servers...
taskkill /F /IM llama-server.exe 2>nul
taskkill /F /IM llama-swap.exe 2>nul
echo   [stopped]
timeout /t 2 >nul
