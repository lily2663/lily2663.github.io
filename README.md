# Lily Epitaph

个人 Hugo 博客与模块化主题。站点内容、布局和功能模块由声明式配置组合；本地管理工作台 **LilyMap** 用于写作导入、资源管理、页面编排、外观设置和发布前检查。

## 本地使用

双击 `start-hugo-desk.bat`，或在仓库根目录运行：

```powershell
npm run admin
```

- LilyMap：`http://localhost:5174/`
- 博客预览：`http://localhost:1414/`

常用验证命令：

```powershell
npm run check
npm run build
npm run audit:assets
```

## 模块化结构

- `data/lily/layouts/`：用户页面布局与槽位顺序
- `data/lily/modules/`：用户模块配置
- `data/lily/music/`：音乐歌单静态快照
- `themes/lily-epitaph/data/lily/modules/`：模块清单与配置协议
- `themes/lily-epitaph/layouts/partials/lily/modules/`：模块模板
- `themes/lily-epitaph/assets/lily/modules/`：模块样式与脚本

LilyMap 的“布局”页面可视化组合模块；“模块库”支持把网易云歌单导入为本地静态快照。登录 Cookie 仅用于单次本机请求，不应写入配置、源码或 Git。

详细日常操作见本地文档 `docs/USAGE.md`（该目录按设计不发布）。
