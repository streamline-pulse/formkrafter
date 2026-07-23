---
title: Bricks
description: The 30 built-in bricks and how to register your own.
---

A form spec is a tree of **bricks**. Each brick has a `type` (`input`, `panel`, `collection`, `output`, `action`), an `id` (which registered brick renders it), `configs` (with a unique `uid` and a data `key`), plus optional `validations`, `rules`, `styles` and `children`.

## Built-in bricks

| Category | Bricks |
|---|---|
| **Inputs** (19) | text, email, password, url, phone, textarea, number, date, time, datetime, select, multi-select, radio, select-boxes, checkbox, tags, signature, address, code (CodeMirror, lazy-loaded) |
| **Data** (3) | file (pluggable upload, per-brick `uploadUrl`, `multiple` mode), data-grid (repeating rows, per-row validation, row reordering), hidden |
| **Layout** (8) | content, recap (live summary of the whole form), nested-form (reference another form by `specRef`), group (fieldset), row, column, stepper (wizard), tabs |

Notable behaviors:

- **select / multi-select** — searchable combobox implementing the full WAI-ARIA pattern (keyboard navigation, focus management). Options come from `static` text, the form's `dataMap`, a `remote` URL (headers with `{key}` interpolation, optional server-side search param, cached), sandboxed `js`, or a shared `catalog` (`optionsRef` resolved through `services.optionSourceService` — store a big list once, reference it from every form). `labelKey`/`valueKey` accept dotted paths like `name.common`.
- **data-grid** — the row template is edited like any panel; at render time each row scopes its own data. `minItems`/`maxItems` validate row counts, rows reorder with accessible up/down buttons, and `validate()` reports `contacts[0].email`-style keys.
- **stepper** — per-step validation gate, optional step-click jumping, optional Submit button emitting `formSubmit`. **tabs** — optional "validate tab before leaving", arrow-key navigation.
- **text / phone** — optional `prefix`/`suffix` adornments and a `mask` config (`9` digit, `a` letter, `A` uppercase, `*` alphanumeric; literals are inserted automatically).
- **code** — a JavaScript editor with autocompletion fed by the form's field keys (`dataMap.<key>`), loaded lazily so it never weighs on forms that don't use it.
- **nested-form** — set `specRef` in its configs; at render time the referenced form is resolved through `services.specSourceService` and inlined. See [nested forms](/formkrafter/guides/nested-forms/).
- **recap** — a live, read-only summary of the whole form; `groupBySections` turns labelled panels into titled sections and collections render as tables.

## Custom bricks

```ts
import { createBrick, h, registerBrick } from '@streamline-pulse/formkrafter-wc'

registerBrick(createBrick({
  type: 'input', dataType: 'number', id: 'rating', name: 'Rating', category: 'Inputs',
  defaultConfigs: { label: 'Rating' },
  render: (props) =>
    h('div', { class: { 'fk-field': true } },
      ...[1, 2, 3, 4, 5].map((star) =>
        h('button', {
          type: 'button',
          onClick: () => props.onDataChange?.(star),
        }, '★')
      )
    ),
}))
```

`h` (and the `VNode` type) are re-exported by `formkrafter-wc` — your app needs no Stencil dependency. Registered bricks appear in the palette, and the registry is a **page-wide singleton**: register once at startup and every builder/renderer instance sees them.
