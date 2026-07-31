@echo off
cd /d %~dp0

REM Double-clicking may lack git/node in PATH; append common install paths
if exist "C:\Program Files\Git\cmd" set "PATH=%PATH%;C:\Program Files\Git\cmd"
if exist "C:\Program Files (x86)\Git\cmd" set "PATH=%PATH%;C:\Program Files (x86)\Git\cmd"
if exist "C:\Program Files\nodejs" set "PATH=%PATH%;C:\Program Files\nodejs"

echo [1/3] Regenerating article index (articles.js) ...
node generate.js
if errorlevel 1 (
  echo [ERROR] generate.js failed. Aborting.
  pause
  exit /b 1
)

echo [2/3] Committing changes ...
git add -A
git diff --cached --quiet
if errorlevel 1 (
  git -c user.email="lily@local" -c user.name="lily" commit -m "publish: %date% %time%"
) else (
  echo   (no changes, skipping commit)
)

echo [3/3] Pushing to GitHub ...
if not exist ".token" (
  echo [ERROR] blog/.token not found. Aborting.
  pause
  exit /b 1
)
set /p TOKEN=<.token
if "%TOKEN%"=="" (
  echo [ERROR] .token is empty. Aborting.
  pause
  exit /b 1
)
git -c "url.https://oauth2:%TOKEN%@github.com/.insteadOf=https://github.com/" push origin main
if errorlevel 1 (
  echo [ERROR] Push failed. Check .token validity and network.
  pause
  exit /b 1
)
echo [OK] Published! Wait 1-2 min for GitHub Pages, then visit https://lily2663.github.io/
pause
