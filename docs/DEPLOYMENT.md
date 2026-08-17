# 本地验收与上线

上线前运行 `npm run build`，再查看 `public/` 的首页、长文、受保护文章、标签、友链和关于页。确认 `git status` 不包含 `.secrets/`、`private-content/`、`.tools/` 或 `public/`。

GitHub 上线前需明确授权。授权后推送功能分支、审阅差异、合并 main，并在仓库 Pages 设置中将发布源改为 GitHub Actions。若部署异常，回滚至原基线提交 `78b9564`。
