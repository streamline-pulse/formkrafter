# @streamline-pulse/formkrafter-core

## 0.16.0

### Minor Changes

- 40aa70f: Address every brick by path

  `updateBrickConfigs`, `updateBrickStyles`, `updateBrickValidations` and
  `updateBrickRules` took a `uid` while `addBrick`, `removeBrick`, `moveBrick` and
  `duplicateBrick` took a path. They now all take a path, so there is one way to
  point at a brick instead of two.

  `pointerOfUid` is gone — with nothing addressed by uid, it had no callers. Use
  `getBrickAt(spec, path)` to reach a brick and `pointerFromPath(path)` for its
  JSON Pointer.

  `fk-form-render`'s `selectedUid` prop is now `selectedPath`, and the
  `brickConfigsChange`, `brickStylesChange`, `brickValidationsChange` and
  `brickRulesChange` events carry `path` instead of `uid`.

  A path that does not resolve to a brick now throws instead of silently
  resolving to the root. `getBrickAt` previously returned the root for any string
  without a dot separator, which made a malformed path edit the wrong node.

## 0.15.2

### Patch Changes

- 442868b: ajv, ajv-errors and ajv-formats are now bundled into the published
  build instead of being runtime dependencies. ajv-errors reads ajv's
  codegen internals, so it silently emits invalid JavaScript when the two
  resolve to different copies — which is what a consuming app gets as
  soon as anything else (eslint, for one) holds the hoisted `ajv` slot.
  The schema then fails to compile and validation is skipped entirely.
  Bundling removes the resolution from the equation: applications declare
  nothing, and a duplicate ajv elsewhere in the tree no longer reaches
  this package. Consumers who bundle for the browser pay 0.7 KB gzipped
  for it, since their bundler already pulled ajv in.

## 0.15.1

### Patch Changes

- 53196e1: A validation schema that fails to compile no longer disables validation
  silently. `compiledValidator` swallowed the error and returned no
  validator, so `validateFormData` answered `valid: true` for every
  payload — a fail-open that hid a duplicated ajv instance in a consuming
  app for as long as it took to notice submissions were never rejected.
  The failure now surfaces through the `warnings` channel alongside the
  reason.

## 0.15.0

### Minor Changes

- 124eb56: New `lintSpec(spec)` reports the spec mistakes that fail silently:
  validations declared on a brick with no `dataType` (they are skipped
  entirely, client and server), data-carrying bricks without a `key`,
  duplicate keys colliding in the form data, and collections with no row
  template. `validateFormData` now also returns `warnings` when it had to
  skip validations that way, so the failure stops being invisible.

## 0.14.0

### Minor Changes

- b9ea5c5: Brick `uid`s become a builder-session detail instead of part of the
  stored spec. `fk-form-builder` hydrates missing uids whenever a spec
  loads — until now it only did so for clipboard imports, so a spec passed
  through the `spec` prop without uids could not be selected or edited at
  all, silently — and strips them from the spec and patches it emits.
  `convertFormioForm` no longer emits them either.

  Nothing on the render path ever read `uid`: validation, rules, recap and
  nested-form expansion are unaffected, and patches address bricks by JSON
  path. New core helpers `ensureBrickUids`, `stripBrickUids` and
  `stripUidsFromPatches` make the transform available to any host.

## 0.13.4

### Patch Changes

- fb4b1ce: `convertFormioForm` no longer crashes on option lists of scalars.
  Form.io commonly emits `data.json: ["A0", "A1", "LETTER"]`, and the
  converter assumed every item was an object — `"value" in items[0]` threw
  `TypeError: ... is not an Object`. Scalar items now become
  `{ label: String(item), value: String(item) }`, objects keep their
  `valueProperty` / template mapping, and mixed or empty lists are handled.
  The same hardening covers `values` lists, where scalars used to convert
  silently into empty options.

## 0.13.3

## 0.13.2

## 0.13.1

## 0.13.0

## 0.12.0

## 0.11.1

## 0.11.0

## 0.10.1

### Patch Changes

- 91b49e8: FetchDataSourceService now throws when a data source returns a non-array
  payload instead of silently coercing it to an empty list — an API error
  notice used to hide behind an empty select.

## 0.10.0

### Minor Changes

- e5b0da3: The native select gains every option source the web has — remote HTTP
  with `{token}` interpolation, header lines and debounced
  search-as-you-type, catalog through optionSourceService, dataMap paths
  and sandboxed JS — plus a search field and loading state in the sheet;
  the remote-options helpers move from wc into core for that. The data
  grid arrives natively: rows as cards rendered through the same brick
  registry (custom bricks work inside a grid for free), with add, remove,
  reorder and per-row validation. The stepper gets a proper design:
  numbered circles joined by progress connectors, done checkmarks and a
  full-width primary action.

## 0.9.0

### Minor Changes

- 2c9e8de: Six more native bricks: recap, content, hidden, tags, select boxes and
  address — 24 of the 30 web bricks now render natively. The recap
  summarization (`collectRecapItems`, `RecapItem`) moves from the wc brick
  into core so both renderers share the exact same walk; wc consumes it
  from there.

## 0.8.0

## 0.7.1

## 0.7.0

### Minor Changes

- 66d9d05: New package: `formkrafter-react-native`, a renderer for React Native and
  Expo. It ships the form engine (state, touched tracking, rules, nested-form
  expansion, validation) as a framework-agnostic class plus a React hook, a
  native brick registry, a theme provider mirroring the web tokens, and a
  first set of bricks: text variants, number, checkbox, select and the
  column/row/group layouts.

  To share the plumbing across renderers, core now exports the chrome
  translations (`fkT`, `fkTOr`, `setFkTranslations`, `frFkTranslations`), the
  brick data helpers (`getBrickData`, `wrapBrickData`) and the option parser
  (`normalizeOptions`). The wc package re-exports all of them, so nothing
  changes for existing consumers.

## 0.6.2

## 0.6.1

## 0.6.0

### Minor Changes

- 5599714: **Breaking:** `JsRunnerService.validateJs()` now returns `{ valid }` instead of
  `{ valide }`.

  The misspelling was part of the public interface, so anyone implementing a
  custom JS runner or reading the result inherited it. The result type is now
  exported as `JsValidationResult`:

  ```ts
  import type { JsValidationResult } from "@streamline-pulse/formkrafter-core";

  const { valid, error } = services.jsRunnerService.validateJs(code);
  ```

  If you read `validation.valide`, rename it to `validation.valid`. If you
  implement `JsRunnerService` yourself, return `valid` from `validateJs`. Nothing
  else changes — the semantics and the `error` field are untouched.

  **Also removed:** the `JsRunnerServiceImplementation` export, an unused alias of
  `SandboxJsRunnerService`. Import `SandboxJsRunnerService` directly.

## 0.5.1

## 0.5.0

### Minor Changes

- 0b2cf38: Slimmer specs for option-heavy forms:

  - `convertFormioForm` now emits static options as a compact newline string whenever every option's label equals its value (the common case in Form.io exports) — real production specs shrink up to 4× vs the Form.io definition. Lists where labels differ keep the `{ label, value }` object form.
  - The converter warns when a component embeds more than 100 static options, recommending a remote source or a shared catalog.
  - New `catalog` options source for select/multi-select: set `optionsRef` and the options are resolved through the new `services.optionSourceService` (default `FetchOptionSourceService`: treats the ref as a URL, supports `baseUrl`, headers, credentials and per-URL caching). Store a big list once, reference it from any number of forms.

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

## 0.3.0

### Minor Changes

- e48934e: Multi-file uploads and a much lighter render bundle.

  - The file brick now supports `multiple: true` in its configs: the value becomes an `UploadedFile[]`, each file has its own remove button (calling the upload service's `remove`), and an "+ Add a file" button appends more. The Form.io converter maps `multiple` file components to it (dataType `array`).
  - CodeMirror is now loaded lazily by `fk-code-editor`: it only downloads when a code editor is actually shown (Rules/JS panels in the builder). Render-only consumers no longer pay for it — the FormKrafter chunk of a typical app drops from ~1 MB to ~424 KB minified (~125 KB gzip).

### Patch Changes

- 973d369: Accessibility pass on the rendered form controls.

  - Select / multi-select now implement the WAI-ARIA combobox pattern: focusable trigger (`role="combobox"`, `aria-expanded`, `aria-controls`), listbox with per-option ids and `aria-activedescendant`, full keyboard support (ArrowUp/Down, Home/End, Enter, Escape with focus return, Tab closes), highlighted active option, accessible labels on chip-remove and clear buttons, `aria-invalid` when the field has an error.
  - Validation errors render as `role="alert"` live regions and native inputs (text family, textarea, number, date, radio group) carry `aria-invalid`.
  - Stepper steps are real buttons with `aria-current="step"`; tabs get `aria-selected`, roving tabindex and ArrowLeft/ArrowRight navigation.
  - Consistent `:focus-visible` outlines across all interactive controls.

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

## 0.1.1

### Patch Changes

- Fix internal dependency ranges: 0.1.0 was published with workspace dependencies resolved to the non-existent 0.0.1 (stale lockfile at publish time). No code changes.

## 0.1.0

### Minor Changes

- Initial public release of FormKrafter: framework-agnostic drag & drop form builder.

  - `formkrafter-core`: form specs, RFC 6902 ops with undo/redo, Ajv validation with localized messages, sandboxed rules engine (no eval), backend `validateFormData`, injectable services.
  - `formkrafter-wc`: Stencil web components — `fk-form-builder`, `fk-form-render`, 27 built-in bricks, theming via `--fk-*` tokens with dark mode, builder chrome i18n (en/fr), remote selects with auth-aware headers.
  - `formkrafter-react` / `formkrafter-vue`: generated bindings for the web components.
