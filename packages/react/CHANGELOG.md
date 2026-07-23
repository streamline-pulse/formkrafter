# @streamline-pulse/formkrafter-react

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
