# 架构

Hugo 负责公开 Markdown 的静态 HTML、标签、RSS、sitemap 与 JSON 搜索索引。主题位于 `themes/lily-epitaph`，交互脚本位于 `static/js`。

受保护文章由本地 Node 脚本以 PBKDF2-SHA-256（600000 次）和 AES-256-GCM 生成版本化密文。浏览器仅在用户输入密码后加载 Markdown 渲染器；公开文章不依赖运行时 Markdown 渲染。

评论继续调用 `https://api.lily2663.top`，并使用稳定的 `params.commentId` 保持历史数据连续。旧 Hash 链接在首页加载时转换为 Hugo 永久链接。
