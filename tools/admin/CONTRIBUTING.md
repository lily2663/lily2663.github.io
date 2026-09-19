# Contributing to LilyMap

LilyMap is a local-first manager for Hugo projects using the Lily theme contract.

Run the manager during development with `npm run start`. Before opening a pull request, run:

```powershell
npm run check
npm run build
```

Keep the management API loopback-only. Never add token values, private article sources, personal blog content, or machine-specific paths to fixtures, screenshots, issues, or commits.

Changes to configuration fields must preserve unknown values in user files. Changes to the Lily module protocol must update the theme's module manifest validation in the paired theme repository.
