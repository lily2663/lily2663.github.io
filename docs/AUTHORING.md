# 写作与受保护内容

公开文章放在 `content/posts/<slug>/index.md`。每篇文章必须有 title、date、summary、tags、slug 与 `params.commentId`。

受保护文章原文放在 `private-content/<id>.md`，密码仅放在 `.secrets/protected-posts.json`。运行 `npm run protect` 后会生成可提交的 `/protected/<id>.json` 密文。静态站密码功能仅用于轻量访问门槛，不可视为强保密。

图片使用 `/assets/img/...` 根路径。新图片应先放到 `static/assets/img/`，再在文章中引用。不要在文章正文外使用可执行的原始 HTML；示例脚本必须放在代码围栏内。
