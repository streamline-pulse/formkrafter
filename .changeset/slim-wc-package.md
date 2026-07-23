---
"@streamline-pulse/formkrafter-wc": minor
---

Slimmer npm package: 6.7 MB → 2.0 MB unpacked (195 → 115 files).

The package now ships only what its three consumption paths use: `dist/components` (bundlers, the `"."` export), `dist/formkrafter-wc` (CDN script-tag + `styles.css`) and `dist/types`. The duplicate `dist/esm`, `dist/cjs`, `dist/collection` outputs and the legacy `./loader` entry are no longer published — same components, same features, different packaging only. If you consumed the package from CommonJS `require()`, switch to `import` (the package is now ESM-only).
