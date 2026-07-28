---
"@streamline-pulse/formkrafter-react": patch
"@streamline-pulse/formkrafter-vue": patch
"@streamline-pulse/formkrafter-wc": patch
---

Fix package resolution under Node's ESM loader (SSR).

The React and Vue entry points re-exported their generated components with an
extensionless relative specifier (`export * from './components/components'`).
Bundlers accept that, but Node's ESM resolver requires the exact path, so any
consumer importing the package from a real Node process — typically SSR with
the dependency externalised — failed with:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../dist/components/components'
imported from .../formkrafter-react/dist/index.js
```

The specifiers now carry their `.js` extension, in the emitted JavaScript and
in the type declarations alike. Consumers who worked around this with
`ssr.noExternal: ['@streamline-pulse/formkrafter-*']` in Vite can drop it.

The Web Components package also now declares `"type": "module"`. It has always
shipped ESM only, but without the field Node had to detect the module type by
re-parsing each file, which emitted a `MODULE_TYPELESS_PACKAGE_JSON` warning and
cost startup time on every import.

A smoke test (`bun run smoke:esm`) now imports all four packages by name from a
scratch Node ESM project on every CI run, so this class of regression fails the
build instead of reaching npm.
