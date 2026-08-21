@echo off
rem Hugo Desk launcher - starts the local blog admin server and opens the browser.
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo [Hugo Desk] ERROR: node.exe not found in PATH.
  echo [Hugo Desk] Install Node.js LTS from https://nodejs.org or add it to PATH, then retry.
  pause
  exit /b 1
)
echo [Hugo Desk] Starting admin server...
echo [Hugo Desk]   Admin UI : http://localhost:5174/
echo [Hugo Desk]   Preview  : http://localhost:1414/
echo [Hugo Desk] Keep this window open while working. Close it to stop the server.
start "" /b cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:5174/"
node "tools\admin\server.mjs"
echo.
echo [Hugo Desk] Server stopped.
pause
