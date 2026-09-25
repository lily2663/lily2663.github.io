# Lily Epitaph Blog

个人 Hugo 博客与模块化主题。站点内容、布局和功能模块由声明式配置组合；本地管理工作台 **LilyMap** 用于写作导入、资源管理、页面编排、外观设置和发布前检查。

## 本地使用

首次克隆需要同时拉取主题与管理台子模块：

```powershell
git clone --recurse-submodules https://github.com/lily2663/lily2663.github.io.git
```

如果已经克隆过本仓库，运行：

```powershell
npm run deps:init
```

首次执行 `npm run build`、`npm run dev` 或 `npm run preview` 会自动下载并校验 Hugo 0.165.0 到本机 `.tools/`；也可以提前运行 `npm run tools:bootstrap`。如需使用其他本机位置的 Hugo，可设置 `LILY_HUGO_PATH`。

双击 `LilyMap.exe`（先运行一次 `npm run lilymap:exe` 生成），双击保留的 `start-hugo-desk.bat`，或在仓库根目录运行：

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

## Reusable projects

- [`tools/admin/`](https://github.com/lily2663/lilymap)：LilyMap Git 子模块，源码与 Windows EXE 打包配置的唯一来源。
- [`themes/lily-epitaph/`](https://github.com/lily2663/lily-epitaph)：Lily 主题 Git 子模块，可独立使用的 Hugo 主题和示例站点。
  主题所需的受保护文章渲染、代码高亮与离线缓存运行时由主题自身提供；主博客只保留站点级覆盖与内容资源。

主博客固定记录两者的兼容提交；日常更新使用 `npm run deps:update`，更新后必须运行 `npm run build` 再提交新的子模块指针。兼容协议见 [OPEN_SOURCE.md](./OPEN_SOURCE.md)。
