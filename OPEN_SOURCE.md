# Reusable-project integration

The open-source split is complete. This repository is the private/content-bearing
Hugo site, while reusable code lives in two public repositories and is consumed
here as pinned Git submodules.

| Project | Canonical repository | Mounted path | Responsibility |
| --- | --- | --- | --- |
| LilyMap | [`lily2663/lilymap`](https://github.com/lily2663/lilymap) | `tools/admin/` | Local management UI, API, EXE packaging, and configuration contract |
| Lily theme | [`lily2663/lily-epitaph`](https://github.com/lily2663/lily-epitaph) | `themes/lily-epitaph/` | Hugo presentation layer, Lily module protocol, example site, and theme assets |

## Working with the relationship

Clone the blog together with its dependencies:

```powershell
git clone --recurse-submodules https://github.com/lily2663/lily2663.github.io.git
```

For an existing checkout, initialize the pinned versions:

```powershell
npm run deps:init
```

The pinned commits are deliberate: a blog build must always use a known-compatible
LilyMap and theme pair. To deliberately adopt the latest `main` commits from both
projects, run:

```powershell
npm run deps:update
npm run build
git add tools/admin themes/lily-epitaph .gitmodules
git commit -m "chore: update reusable project dependencies"
```

## Compatibility contract

LilyMap discovers the active Hugo theme from `hugo.toml` and requires
`theme-config.schema.json`. The Lily theme provides built-in modules under
`data/lily/modules/`; the site provides its own layouts and module configuration
under `data/lily/`.

Before advancing either submodule pointer, verify all three layers:

```powershell
npm --prefix tools/admin run check
Set-Location themes/lily-epitaph/exampleSite
hugo --themesDir ../.. --gc --minify --panicOnWarning
Set-Location ../../..
npm run build
```

GitHub Pages checks out submodules recursively before it validates and builds the
site. Public reusable repositories must never contain personal content, deployment
tokens, local configuration, or protected-content payloads.
