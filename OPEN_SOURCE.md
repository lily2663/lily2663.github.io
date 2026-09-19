# Open-source split plan

This working blog contains two reusable projects that will be extracted without bringing personal content with them.

| Future repository | Current source boundary | Contains | Must not contain |
| --- | --- | --- | --- |
| `lilymap` | `tools/admin/` | Local management UI, API, EXE packaging, configuration contract | Tokens, project config, post sources, uploaded media |
| `hugo-theme-lily` | `themes/lily-epitaph/` | Hugo theme, Lily module protocol, example site, theme assets | Personal content, deployment settings, private payloads |

## Readiness contract

LilyMap detects the active Hugo theme from `hugo.toml` and requires the theme to expose `theme-config.schema.json`. The paired theme exposes built-in Lily modules under `data/lily/modules/`. Both projects use the MIT license.

Each boundary contains its own contribution guide and GitHub Actions validation workflow so the workflow moves with the extracted history.

## Extraction procedure

When both source boundaries have passed their independent checks, create separate history-preserving branches from this repository:

```powershell
git subtree split --prefix=tools/admin -b release/lilymap
git subtree split --prefix=themes/lily-epitaph -b release/hugo-theme-lily
```

Push those branches into newly created repositories. Do not create the remote repositories until the public asset audit, README review, and clean-clone validation are complete.

## Pre-publication checklist

- Verify no private text, tokens, encryption sources, machine paths, or personal media exist in either source boundary.
- Verify LilyMap starts from an EXE and a clean source checkout.
- Verify the theme example site builds with the documented Hugo version.
- Verify a fresh Hugo project can use the theme and LilyMap together.
- Tag compatible LilyMap and theme releases together in the first release notes.
