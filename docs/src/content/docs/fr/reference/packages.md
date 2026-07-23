---
title: Packages
description: Les quatre packages npm, leurs points d'entrée et leurs relations.
---

Tous les packages sont publiés sous le scope `@streamline-pulse` avec des **versions synchronisées** (une release bumpe les quatre).

## `formkrafter-core`

TypeScript headless : pas de DOM, pas de framework — navigateurs, Node, Bun, workers.

- **Specs & ops** — `addBrick`, `removeBrick`, `moveBrick`, `duplicateBrick`, `updateBrick*` ; chaque op retourne `{ spec, patches, inverse }` (RFC 6902 dans les deux sens) et `SpecHistory` donne l'undo/redo.
- **Validation** — `validateFormData(spec, data, locale?)` pour les backends, `buildValidationSchema` pour les curieux.
- **Sandbox de règles** — `runSandboxed(code, scope)`, interpréteur AST Acorn, sans `eval`.
- **Services** — points d'injection `services.*` ([guide](/formkrafter/fr/guides/services/)).
- **Converter Form.io** — `convertFormioForm` ([guide](/formkrafter/fr/guides/formio-migration/)).
- **Formulaires imbriqués** — `expandSpec`, `hasNestedForms` ([guide](/formkrafter/fr/guides/nested-forms/)).

## `formkrafter-wc`

L'UI en Web Components Stencil. L'entrée du package est le **build custom elements** (tree-shakeable, ESM uniquement) :

```ts
import '@streamline-pulse/formkrafter-wc'            // composants
import '@streamline-pulse/formkrafter-wc/styles.css' // tokens + styles des bricks (opt-in)
```

Pour l'usage en balise script, un bundle CDN à chargement lazy est fourni dans `dist/formkrafter-wc/formkrafter-wc.esm.js`. Exporte aussi le registre de bricks (`registerBrick`, `createBrick`, `h`) et l'i18n du chrome (`setFkTranslations`, `frFkTranslations`).

## `formkrafter-react` / `formkrafter-vue`

Wrappers générés, fins, avec props et événements typés :

```tsx
import { FkFormBuilder, FkFormRender } from '@streamline-pulse/formkrafter-react'
```

```ts
import { FkFormBuilder, FkFormRender } from '@streamline-pulse/formkrafter-vue'
```

Ils ne réexportent rien d'autre — les types viennent de `formkrafter-core`, le style de `formkrafter-wc/styles.css`.

## Versioning & releases

Les releases sont automatisées avec Changesets : une PR par release, tous les packages bumpés ensemble, publication depuis la CI. Le changelog de chaque package liste exactement ce qui est parti dans sa version.
