---
title: Dynamic rules
description: Conditional visibility, requiredness and computed values — JSON Logic or sandboxed JavaScript, no eval.
---

Rules drive dynamic behavior: `hidden`, `disabled`, `required`, or a computed `value`. Each rule has a trigger (JSON Logic or JavaScript) and effects on target properties.

## Two modes

**`jsonLogic`** (default) — serializable and declarative:

```json
{
  "type": "jsonLogic",
  "logic": { "!": { "in": [{ "var": "country" }, ["FR", "DE"]] } },
  "effects": [{ "property": { "target": "hidden", "type": "boolean" }, "boolean": true }]
}
```

**`javaScript`** — the escape hatch, executed by a built-in **AST interpreter** (Acorn-based), never `eval`:

```js
return dataMap.quantity > 10 ? 'GOLD' : 'STANDARD';
```

## The sandbox

- **CSP-safe** — no `unsafe-eval` needed anywhere.
- **Isolated** — only `dataMap` (the form values) and `value` (in custom validators), plus whitelisted builtins (`Math`, `JSON`, `String`, …). No `fetch`, no `globalThis`, no `constructor`/`__proto__` escapes.
- **Expressive enough** — expressions, ternaries, `const`/`let`, `if`/`return`, template literals, optional chaining, arrow functions (`.filter(x => …)`).
- **Bounded** — unsupported syntax is rejected upfront and runaway code is cut by an execution budget.

The builder's rule editor (CodeMirror, lazy-loaded) autocompletes `dataMap.` with your form's actual field keys.

```ts
import { runSandboxed, UnsafeEvalJsRunnerService, services } from '@streamline-pulse/formkrafter-core'

runSandboxed('return items.filter((i) => i > 2)', { items: [1, 2, 3] })   // [3]

// trusted environments can opt back into full JS:
services.jsRunnerService = new UnsafeEvalJsRunnerService()
```

## Interaction with validation

A brick hidden by a rule (or inside a hidden parent) is skipped by validation — on the frontend **and** in `validateFormData` on the backend. A required field on wizard step 3 that a rule hides can never block the submit.
