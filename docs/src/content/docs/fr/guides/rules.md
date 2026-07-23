---
title: Règles dynamiques
description: Visibilité conditionnelle, champs requis et valeurs calculées — JSON Logic ou JavaScript sandboxé, sans eval.
---

Les règles pilotent le comportement dynamique : `hidden`, `disabled`, `required`, ou une `value` calculée. Chaque règle a un déclencheur (JSON Logic ou JavaScript) et des effets sur des propriétés cibles.

## Deux modes

**`jsonLogic`** (par défaut) — sérialisable et déclaratif :

```json
{
  "type": "jsonLogic",
  "logic": { "!": { "in": [{ "var": "country" }, ["FR", "DE"]] } },
  "effects": [{ "property": { "target": "hidden", "type": "boolean" }, "boolean": true }]
}
```

**`javaScript`** — l'échappatoire, exécutée par un **interpréteur AST** intégré (basé sur Acorn), jamais `eval` :

```js
return dataMap.quantity > 10 ? 'GOLD' : 'STANDARD';
```

## Le sandbox

- **Compatible CSP** — aucun `unsafe-eval` requis, nulle part.
- **Isolé** — seulement `dataMap` (les valeurs du formulaire) et `value` (dans les validateurs custom), plus des builtins whitelistés (`Math`, `JSON`, `String`, …). Pas de `fetch`, pas de `globalThis`, pas d'évasion `constructor`/`__proto__`.
- **Suffisamment expressif** — expressions, ternaires, `const`/`let`, `if`/`return`, template literals, chaînage optionnel, fonctions fléchées (`.filter(x => …)`).
- **Borné** — la syntaxe non supportée est rejetée d'emblée et le code qui s'emballe est coupé par un budget d'exécution.

L'éditeur de règles du builder (CodeMirror, chargé en lazy) autocomplète `dataMap.` avec les vraies clés de champs de votre formulaire.

```ts
import { runSandboxed, UnsafeEvalJsRunnerService, services } from '@streamline-pulse/formkrafter-core'

runSandboxed('return items.filter((i) => i > 2)', { items: [1, 2, 3] })   // [3]

// les environnements de confiance peuvent revenir au JS complet :
services.jsRunnerService = new UnsafeEvalJsRunnerService()
```

## Interaction avec la validation

Une brick cachée par une règle (ou dans un parent caché) est ignorée par la validation — côté frontend **et** dans `validateFormData` côté backend. Un champ requis à l'étape 3 d'un wizard qu'une règle cache ne peut jamais bloquer le submit.
