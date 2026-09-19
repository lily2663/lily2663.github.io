# Contributing to lily-epitaph

Use the example site to validate theme changes:

```powershell
Set-Location exampleSite
hugo --themesDir ../.. --gc --minify
```

Keep the theme free of personal content, credentials, private article sources, and deployment settings. New visible modules need a manifest, typed configuration fields, documented slots, and an accessible empty state.

LilyMap reads `theme-config.schema.json` and `data/lily/modules/` as its integration contract. Update those files when a user-facing configuration field or module capability changes.
