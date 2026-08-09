# @streamline-pulse/formkrafter-vue

## 0.6.0

### Patch Changes

- Updated dependencies [da9712f]
- Updated dependencies [5599714]
  - @streamline-pulse/formkrafter-wc@0.6.0

## 0.5.1

### Patch Changes

- 5d708fd: Fix package resolution under Node's ESM loader (SSR).

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

- Updated dependencies [5d708fd]
  - @streamline-pulse/formkrafter-wc@0.5.1

## 0.5.0

### Patch Changes

- Updated dependencies [0b2cf38]
- Updated dependencies [c31d1c9]
  - @streamline-pulse/formkrafter-wc@0.5.0

## 0.4.0

### Minor Changes

- da442d9: Code brick and a friendlier empty canvas.

  - New `code` input brick: a CodeMirror editor (lazy-loaded, One Dark in dark contexts) for collecting JavaScript or any code snippet as a string value; shows a static preview inside the builder canvas.
  - Code editors gain JavaScript autocompletion: language snippets plus the form's field keys, offered as bare variables and as `dataMap.<key>` completions — in the code brick (keys from the rendered form) and in every builder editor (rules, custom validator, JS options).
  - The empty builder canvas is now a single large drop zone — the "your form is empty" message and the drop target are one and the same, so the first brick can be dropped anywhere on it.

- 9f48150: Input masks, data-grid row reordering, nested option keys and a dark code editor.

  - Text and phone bricks support a `mask` config (`9` digit, `a` letter, `A` uppercase letter, `*` alphanumeric — literals auto-inserted), editable in the property panel. The Form.io converter maps `inputMask` to it.
  - Data-grid rows can be reordered with accessible up/down buttons; per-row touched state follows the move.
  - `labelKey` / `valueKey` accept dotted paths (`name.common`) for object-shaped options, in every options source.
  - The code editor switches to the One Dark theme when rendered inside a dark context (`.dark` or `data-fk-theme="dark"`).

- a7b15b8: Nested forms: reference a form inside another form.

  - New `nested-form` brick: point it at another spec through its `specRef` config (editable in the property panel). At render time the referenced form is resolved and inlined as a labelled group — fields, validations and rules included.
  - New `services.specSourceService` (default: `FetchSpecSourceService`, fetches the ref as a URL with optional `baseUrl`/headers/credentials and caching) — override it to load specs from your own store.
  - New core APIs `expandSpec(spec, options?)` and `hasNestedForms(spec)`: the async expansion pass inlines every reference (cycle detection, configurable depth limit) and returns a plain spec that the whole synchronous pipeline — validation, rules, recap, backend `validateFormData` — consumes unchanged.
  - `fk-form-render` expands automatically, with a loading state and an inline alert when a reference cannot be resolved.
  - The Form.io converter maps `form` components to `nested-form` bricks (their reference kept as `specRef`).

### Patch Changes

- Updated dependencies [da442d9]
- Updated dependencies [9f48150]
- Updated dependencies [a7b15b8]
- Updated dependencies [d886a52]
  - @streamline-pulse/formkrafter-wc@0.4.0

## 0.3.0

### Minor Changes

- 973d369: Accessibility pass on the rendered form controls.

  - Select / multi-select now implement the WAI-ARIA combobox pattern: focusable trigger (`role="combobox"`, `aria-expanded`, `aria-controls`), listbox with per-option ids and `aria-activedescendant`, full keyboard support (ArrowUp/Down, Home/End, Enter, Escape with focus return, Tab closes), highlighted active option, accessible labels on chip-remove and clear buttons, `aria-invalid` when the field has an error.
  - Validation errors render as `role="alert"` live regions and native inputs (text family, textarea, number, date, radio group) carry `aria-invalid`.
  - Stepper steps are real buttons with `aria-current="step"`; tabs get `aria-selected`, roving tabindex and ArrowLeft/ArrowRight navigation.
  - Consistent `:focus-visible` outlines across all interactive controls.

- e48934e: Multi-file uploads and a much lighter render bundle.

  - The file brick now supports `multiple: true` in its configs: the value becomes an `UploadedFile[]`, each file has its own remove button (calling the upload service's `remove`), and an "+ Add a file" button appends more. The Form.io converter maps `multiple` file components to it (dataType `array`).
  - CodeMirror is now loaded lazily by `fk-code-editor`: it only downloads when a code editor is actually shown (Rules/JS panels in the builder). Render-only consumers no longer pay for it — the FormKrafter chunk of a typical app drops from ~1 MB to ~424 KB minified (~125 KB gzip).

### Patch Changes

- Updated dependencies [973d369]
- Updated dependencies [e48934e]
  - @streamline-pulse/formkrafter-wc@0.3.0

## 0.2.0

### Minor Changes

- 700b6f9: New `convertFormioForm(form)` in the core: converts a Form.io form definition into a FormKrafter spec.

  - Inputs: textfield, textarea, number, currency, password, email, url, phoneNumber, datetime/day/time, checkbox, selectboxes, select (static values, multiple, remote url with valueProperty/template/searchField), radio, tags, hidden, file, signature, address.
  - Layout: panel/fieldset/well/container → group, columns → row + columns, tabs → tabs, datagrid/editgrid → data-grid, wizard display → stepper.
  - Validations (required, min/maxLength, min/max, pattern, customMessage) and simple conditionals (`show/when/eq` → hidden rule in json-logic) carry over.
  - Anything unmappable is reported in the returned `warnings` array instead of failing.

- 00bba5a: Recap brick, URL uploads and Form.io converter hardening.

  - New `recap` brick (output): live summary of every filled entry of the form — labels resolved per locale, option values shown as their labels, collections listed row by row, rule-hidden and `_`-private fields excluded. Powered by a new `rootSpec` prop available to all bricks.
  - New `UrlFileUploadService` in the core: multipart upload to a configurable URL (global default or per-brick `uploadUrl` config) with `remove()` support; the file brick now calls `remove` when a file is cleared and shows upload/delete errors.
  - Form.io converter: `dataSrc: "json"` select options, `validate.custom` auto-converted to a sandboxed custom validator, javascript `logic` triggers converted to rules, `filePattern`/`multiple`/storage URL mapping, empty validation bounds ignored, and conditional visibility now wins over the `hidden` flag.
  - radio and select-boxes bricks accept object-shaped options (`[{ label, value }]`) and store values while displaying labels.

### Patch Changes

- Updated dependencies [700b6f9]
- Updated dependencies [00bba5a]
  - @streamline-pulse/formkrafter-wc@0.2.0

## 0.1.1

### Patch Changes

- Fix internal dependency ranges: 0.1.0 was published with workspace dependencies resolved to the non-existent 0.0.1 (stale lockfile at publish time). No code changes.
- Updated dependencies
  - @streamline-pulse/formkrafter-wc@0.1.1

## 0.1.0

### Minor Changes

- Initial public release of FormKrafter: framework-agnostic drag & drop form builder.

  - `formkrafter-core`: form specs, RFC 6902 ops with undo/redo, Ajv validation with localized messages, sandboxed rules engine (no eval), backend `validateFormData`, injectable services.
  - `formkrafter-wc`: Stencil web components — `fk-form-builder`, `fk-form-render`, 27 built-in bricks, theming via `--fk-*` tokens with dark mode, builder chrome i18n (en/fr), remote selects with auth-aware headers.
  - `formkrafter-react` / `formkrafter-vue`: generated bindings for the web components.

### Patch Changes

- Updated dependencies
  - @streamline-pulse/formkrafter-wc@0.1.0
