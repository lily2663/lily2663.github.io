@echo off
rem Hugo Desk launcher - starts the local blog admin server and opens the browser.
cd /d "%~dp0"
echo [Hugo Desk] Starting admin server at http://localhost:5174/
start "" /b cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:5174/"
node "tools\admin\server.mjs"
