---
title: Coming from Form.io
description: Convert Form.io form definitions to FormKrafter specs with convertFormioForm — and what you gain.
---

`convertFormioForm(form)` turns a Form.io form definition into a FormKrafter spec:

```ts
import { convertFormioForm } from '@streamline-pulse/formkrafter-core'

const { spec, warnings } = convertFormioForm(formioJson)
// warnings: anything that could not be mapped
```

The conversion **never throws** on unknown components — they are skipped and reported in `warnings`, so you can migrate a large form portfolio incrementally and audit exactly what needs a manual pass.

## What is mapped

| Form.io | FormKrafter |
|---|---|
| Field components (textfield, email, number, day, select, radio, selectboxes, checkbox, textarea, phone, url, signature, address, …) | The matching input bricks, `inputMask` included |
| Layout: panels, columns, tables, tabs, fieldsets | Layout bricks |
| Wizard (`display: "wizard"`) | stepper with per-step validation |
| datagrid / editgrid | data-grid with per-row validation |
| `validate.*` (required, min/max, lengths, pattern, custom JS) | Validators; custom JS is auto-wrapped for the sandbox (`data`/`row` become `dataMap`) |
| `conditional` (show/when/eq) and JavaScript `logic` triggers | Rules (JSON Logic / sandboxed JS); a conditional takes precedence over an always-hidden flag |
| Select `dataSrc: url / json` | Remote or static options (`valueProperty` → `valueKey`, item templates → `labelKey`, dotted paths supported) |
| File components (`storage: url`, `multiple`) | file brick with `uploadUrl` / `multiple` configs |
| Nested `form` components | nested-form bricks (`specRef`), see [nested forms](/formkrafter/guides/nested-forms/) |
| Content/HTML components | content bricks (conditionals preserved) |

The converter is regression-tested against real production Form.io forms (wizards, conditional file uploads, cascaded selects, custom validators).

## What you gain in weight

Migrating also puts your app on a diet. Methodology: bundles minified and gzipped; FormKrafter v0.5.0 measured with `bun build --minify` from the published package, Form.io `@formio/js` v5.5.0 measured from its official CDN bundles (July 2026).

| | FormKrafter | Form.io |
|---|---|---|
| Builder (renderer included) | **~215 KB** | ~470 KB (`formio.full.min.js`) |
| Renderer only | ~205 KB | ~415 KB (`formio.form.min.js`) |
| Required CSS | 6 KB, optional | 129 KB + Bootstrap |

Two structural differences do most of the work: FormKrafter lazy-loads its code editor (CodeMirror never ships unless a code/rules editor opens), and it has no CSS-framework dependency.

## Keep your specs small

Your stored definitions shrink too. Real-world Form.io exports carry heavy boilerplate (every component serialized with all its defaults), while the converter keeps only what carries meaning and compacts static option lists (a plain newline string whenever labels equal values). Measured on a portfolio of 6 production forms (July 2026, converter v0.5.0):

| | Raw JSON | Gzipped |
|---|---|---|
| Form.io definitions | 277 KB | 40 KB |
| Converted FormKrafter specs | **68 KB** (3–5× smaller per form) | **18 KB** |

The exception worth knowing: a minimal, hand-written Form.io definition can come out slightly *larger* once converted — the spec is more explicit (stable `uid`s for RFC 6902 patches, typed configs). Nobody stores hand-minified definitions, but the import page shows both sizes so you can judge on your own forms.

For the biggest lists (professions, nationalities, …), don't embed them at all — the converter warns when a component carries more than 100 static options and recommends one of:

- **`optionsSource: "remote"`** — the select fetches from your API (with search-as-you-type support);
- **`optionsSource: "catalog"` + `optionsRef`** — a shared catalog resolved through `services.optionSourceService`: the list is stored once and referenced from every form that needs it.

## Sandbox instead of eval

Form.io executes custom validators and logic with real JavaScript. FormKrafter runs converted code in a CSP-safe AST interpreter — see [dynamic rules](/formkrafter/guides/rules/). Converted snippets keep working because the converter injects compatibility aliases (`const data = dataMap; const row = dataMap;`), but they gain the sandbox's isolation for free.
