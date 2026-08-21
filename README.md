# lily'epitaph

一个由 Hugo 驱动的中文安全技术博客。薄荷绿与粉色令牌来自弗洛洛头像和团子宠物，是冻结的品牌资产。

## 本地使用

```powershell
npm run migrate  # 首次把旧 posts/ 转换为 Hugo 内容
npm run dev      # 本地热更新
npm run protect  # 仅在受保护文章原文变更后更新密文
npm run build    # 检查并进行不改写内容的生产构建
```

Hugo 0.165.0 保存在工作区 `.tools/`，不依赖系统全局安装。写作与受保护内容流程的说明文档仅保留在本地。

## 发布边界

当前分支只用于本地验证。GitHub Pages 工作流只读取公开内容与已生成的密文；私密原文和密码位于被 Git 忽略的本地目录，绝不上传。
