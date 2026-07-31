#!/usr/bin/env bash
# 一键发布博客到 GitHub Pages (lily2663.github.io)
# 用法：在 blog/ 目录里执行 ./publish.sh
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo "[1/3] 重新生成文章索引 (articles.js) ..."
node generate.js

echo "[2/3] 提交更改 ..."
git add -A
if git diff --cached --quiet; then
  echo "  （没有改动，跳过提交）"
else
  git commit -m "publish: $(date +'%Y-%m-%d %H:%M')"
fi

echo "[3/3] 推送到 GitHub ..."
TOKEN=""
if [ -f ".token" ]; then
  TOKEN="$(cat .token | tr -d '[:space:]')"
fi
if [ -z "$TOKEN" ]; then
  echo "未找到 .token，请在 blog/.token 写入你的 GitHub PAT，或手动执行：git push origin main"
  exit 0
fi

git -c "url.https://oauth2:$TOKEN@github.com/.insteadOf=https://github.com/" push origin main
echo "✅ 发布完成！等 1~2 分钟 GitHub Pages 构建后访问 https://lily2663.github.io/"
