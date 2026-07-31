@echo off
chcp 65001 >nul
cd /d %~dp0

echo [1/3] 重新生成文章索引 (articles.js) ...
node generate.js

echo [2/3] 提交更改 ...
git add -A
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "publish: %date% %time%"
) else (
  echo   （没有改动，跳过提交）
)

echo [3/3] 推送到 GitHub ...
set /p TOKEN=<.token
git -c url.https://oauth2:%TOKEN%@github.com/.insteadOf=https://github.com/ push origin main
echo 发布完成！等 1~2 分钟访问 https://lily2663.github.io/
pause
