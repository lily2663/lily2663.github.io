@echo off
chcp 65001 >nul
cd /d %~dp0

REM 双击运行时 PATH 常缺失 git/node，这里显式补上常见安装路径
if exist "C:\Program Files\Git\cmd" set "PATH=%PATH%;C:\Program Files\Git\cmd"
if exist "C:\Program Files (x86)\Git\cmd" set "PATH=%PATH%;C:\Program Files (x86)\Git\cmd"
if exist "C:\Program Files\nodejs" set "PATH=%PATH%;C:\Program Files\nodejs"

echo [1/3] 重新生成文章索引 (articles.js) ...
node generate.js
if errorlevel 1 (
  echo ❌ generate.js 执行失败，发布中止
  pause
  exit /b 1
)

echo [2/3] 提交更改 ...
git add -A
git diff --cached --quiet
if errorlevel 1 (
  git -c user.email="lily@local" -c user.name="lily" commit -m "publish: %date% %time%"
) else (
  echo   （没有改动，跳过提交）
)

echo [3/3] 推送到 GitHub ...
if not exist ".token" (
  echo ❌ 未找到 blog/.token，发布中止
  pause
  exit /b 1
)
set /p TOKEN=<.token
if "%TOKEN%"=="" (
  echo ❌ .token 为空，发布中止
  pause
  exit /b 1
)
git -c "url.https://oauth2:%TOKEN%@github.com/.insteadOf=https://github.com/" push origin main
if errorlevel 1 (
  echo ❌ 推送失败，请检查 .token 是否有效 / 网络是否通畅
  pause
  exit /b 1
)
echo ✅ 发布完成！等 1~2 分钟 GitHub Pages 构建后访问 https://lily2663.github.io/
pause
