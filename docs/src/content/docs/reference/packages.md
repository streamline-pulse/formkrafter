---
title: Packages
description: The four npm packages, their entry points and how they relate.
---

All packages are published under the `@streamline-pulse` scope with **synchronized versions** (a release bumps all four).

## `formkrafter-core`

Headless TypeScript: no DOM, no framework — browsers, Node, Bun, workers.

- **Specs & ops** — `addBrick`, `removeBrick`, `moveBrick`, `duplicateBrick`, `updateBrick*`; every op returns `{ spec, patches, inverse }` (RFC 6902 both ways) and `SpecHistory` gives undo/redo.
- **Validation** — `validateFormData(spec, data, locale?)` for backends, `buildValidationSchema` for the curious.
- **Rules sandbox** — `runSandboxed(code, scope)`, Acorn AST interpreter, no `eval`.
- **Services** — `services.*` injection points ([guide](/formkrafter/guides/services/)).
- **Form.io converter** — `convertFormioForm` ([guide](/formkrafter/guides/formio-migration/)).
- **Nested forms** — `expandSpec`, `hasNestedForms` ([guide](/formkrafter/guides/nested-forms/)).

## `formkrafter-wc`

The UI as Stencil Web Components. The package entry is the **custom elements build** (tree-shakeable, ESM-only):

```ts
import '@streamline-pulse/formkrafter-wc'            // components
import '@streamline-pulse/formkrafter-wc/styles.css' // tokens + brick styles (opt-in)
```

For script-tag usage, a lazy-loading CDN bundle ships at `dist/formkrafter-wc/formkrafter-wc.esm.js`. Also exports the brick registry (`registerBrick`, `createBrick`, `h`) and chrome i18n (`setFkTranslations`, `frFkTranslations`).

## `formkrafter-react` / `formkrafter-vue`

Thin generated wrappers with typed props and events:

```tsx
import { FkFormBuilder, FkFormRender } from '@streamline-pulse/formkrafter-react'
```

```ts
import { FkFormBuilder, FkFormRender } from '@streamline-pulse/formkrafter-vue'
```

Both re-export nothing else — types come from `formkrafter-core`, styling from `formkrafter-wc/styles.css`.

## Versioning & releases

Releases are automated with Changesets: one PR per release, all packages bump together, published from CI. The changelog of each package lists exactly what shipped in its version.
