#!/usr/bin/env bash
# One-click publish blog to GitHub Pages (lily2663.github.io)
# Usage: run ./publish.sh inside the blog/ directory
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo "[1/3] Regenerating article index (articles.js) ..."
node generate.js

echo "[2/3] Committing changes ..."
git add -A
if git diff --cached --quiet; then
  echo "  (no changes, skipping commit)"
else
  git -c user.email="lily@local" -c user.name="lily" commit -m "publish: $(date +'%Y-%m-%d %H:%M')"
fi

echo "[3/3] Pushing to GitHub ..."
TOKEN=""
if [ -f ".token" ]; then
  TOKEN="$(cat .token | tr -d '[:space:]')"
fi
if [ -z "$TOKEN" ]; then
  echo "[ERROR] blog/.token not found. Put your GitHub PAT in blog/.token, or run: git push origin main"
  exit 0
fi

git -c "url.https://oauth2:$TOKEN@github.com/.insteadOf=https://github.com/" push origin main
echo "[OK] Published! Wait 1-2 min for GitHub Pages, then visit https://lily2663.github.io/"
