# @streamline-pulse/formkrafter-vue

## 0.27.0

### Minor Changes

- 13d3dd7: **Finance bricks.** `tax-id` checks a tax identifier by `idFormat` (`bj-ifu`,
  `fr-siren` and `fr-siret` with their Luhn key, `digits-<n>`), `iban` checks an
  IBAN with ISO 7064 mod 97-10 and groups it by four, `money` stores
  `{ amount, currency }` with the currency picked among the ones the builder
  offers. The core exposes `checkLuhn`, `checkFrSiren`, `checkFrSiret`,
  `checkBjIfu`, `checkIban` and `formatIban`; new `Finance` category.
- c6d935d: **Geocoded address brick.** `geo-address` looks an address up while typing
  (new `fk-address-search` element; Nominatim `jsonv2` by default, any provider
  answering in that shape through `searchUrl` with `{q}`, optional
  `countryCodes`), lists the matches and stores the pick as a GeoJSON `Feature`
  with the normalised address (street, city, postcode, country, place id) and
  its point, which a map under the field lets the user adjust. Text that is never
  matched stays as a label without geometry. The native renderer edits the label
  only and keeps a point obtained on the web.
- 3c9d0e3: **Zones on a reference layer.** `geo-layer` loads a GeoJSON FeatureCollection
  (`layerUrl`, fetched once per page) and lets the user pick a zone by clicking it
  on the map or from a select; the field stores `{ code, name }` read from
  `codeProperty` / `nameProperty`, or an array of them with `multiple`.
  `fk-geo-map` gains the `layer` mode with `layerUrl`, `selected`, `multiple` and
  a `layerChange` event. The native renderer shows the chosen zones read-only.
- 763eea6: **Identity bricks.** `national-id` is a text field whose check comes from its
  `idFormat`: `fr-nir` (French social security number with its key), `bj-npi`
  (Benin, 10 digits) or `digits-<n>`; the core exposes `checkIdentity` and
  registers one ajv format per rule. `mrz` reads the machine-readable zone of a
  passport (TD3) or identity card (TD1) pasted into it: `parseMrz` extracts the
  document number, nationality, names, dates and sex, verifies every ICAO 9303
  check digit, and the stored object carries `valid` / `errors`, which the
  validation schema enforces through a new `mrzValid` keyword. New `Identity`
  category and `mrz.*` translations.

### Patch Changes

- Updated dependencies [13d3dd7]
- Updated dependencies [c6d935d]
- Updated dependencies [3c9d0e3]
- Updated dependencies [763eea6]
  - @streamline-pulse/formkrafter-wc@0.27.0

## 0.26.0

### Minor Changes

- fd2ec53: **Map bricks.** Two new inputs for geographic data, both stored as GeoJSON
  geometries: `geo-point` (a `Point`, placed by clicking the map, dragged, or
  typed as latitude / longitude) and `geo-area` (a `Polygon`, or a `LineString`
  with `shape: 'line'`, drawn vertex by vertex, dragged, removed with a
  right-click). The map is a new `fk-geo-map` element on Leaflet, loaded on first
  use with OpenStreetMap tiles by default; `center`, `zoom`, `height` and
  `tileUrl` are editable in the builder. The native renderer edits a point by its
  coordinates and shows an area read-only. New `geo.*` and `panel.*` translations.

### Patch Changes

- Updated dependencies [fd2ec53]
  - @streamline-pulse/formkrafter-wc@0.26.0

## 0.25.0

### Minor Changes

- 875742a: **Template variables suggested while typing.** When the form context carries
  `_variables` (`{ name, label? }[]`), text and text-area fields open a list as
  soon as `{{` is typed, filter it with the following characters and insert
  `{{name}}` on Enter or click (new `fk-variable-picker` element, `variables:
false` on a brick opts it out, password fields are never suggested). The core
  gains the `variables.empty` translation.

### Patch Changes

- Updated dependencies [875742a]
  - @streamline-pulse/formkrafter-wc@0.25.0

## 0.24.0

### Minor Changes

- 72b4fa0: **Review reaches grid cells and the native renderer.** A data grid was
  reviewed as one field on the web; now every cell can be flagged and commented
  (`contacts[0].email`, the validation-error scheme) and `editableKeys` can
  unlock single cells, locking the row actions. The native package gets
  `FormReview` plus `annotations`, `notes` and `editableKeys` on `FormRenderer`,
  with the notes and controls drawn by the shared `Field`; a read-only native
  stepper no longer gates on validation nor shows its submit button. Also,
  `formkrafter-core`'s declaration files now use explicit `.js` extensions, so
  its types resolve under TypeScript's `NodeNext` instead of collapsing to `any`.

### Patch Changes

- Updated dependencies [72b4fa0]
  - @streamline-pulse/formkrafter-wc@0.24.0

## 0.23.0

### Minor Changes

- 6ef62cd: **`notes`: remind the reviewer of the previous verdict.** When an applicant
  resubmits after a review, the next reviewer had no trace of what was flagged
  the first time. `<fk-form-review>` and `<fk-form-render>` take `notes`, an
  annotation map shown as a muted "Flagged in the previous review" reminder
  under the fields, while the new review starts empty.

### Patch Changes

- Updated dependencies [6ef62cd]
  - @streamline-pulse/formkrafter-wc@0.23.0

## 0.22.0

### Minor Changes

- aa54f34: **`collectFields` lists what a form collects.** Backends and assistants that
  read or fill submissions had to walk specs themselves and got the field key
  wrong (`configs.name` instead of `configs.key`) or missed the options of a
  select. `collectFields(spec, locale)` now returns every input and collection
  with its key, resolved label, brick id, data type, static options,
  requiredness and, for a collection, the columns of one row.
- 13333b1: **Field review: `<fk-form-review>`, `annotations` and `editableKeys`.** A
  reviewer could only look at a filled form; saying _which_ field was wrong, and
  why, had to be rebuilt by every host. `<fk-form-review>` renders the data
  read-only with an "Incorrect" flag and a comment box under every field and
  emits `reviewChange` with the annotation map. `<fk-form-render>` takes the same
  map as `annotations` to show the notes under the flagged fields, and
  `editableKeys` to leave only those fields editable. `flaggedKeys()` in core
  derives the second from the first. Web only for now: the native renderer
  ignores both props. Also fixed: a `readOnly` form no longer shows the stepper's
  submit button.

### Patch Changes

- Updated dependencies [aa54f34]
- Updated dependencies [13333b1]
  - @streamline-pulse/formkrafter-wc@0.22.0

## 0.21.0

### Patch Changes

- Updated dependencies [4d041ad]
  - @streamline-pulse/formkrafter-wc@0.21.0

## 0.20.0

### Minor Changes

- 0031564: `readOnly` renders `readonly`, not `disabled`

  A read-only form was rendered entirely with `disabled`, which is the wrong
  statement: it says _unavailable_, greys the value out, drops it from the tab
  order and — the blocking part — makes it impossible to select or copy. A review
  panel exists precisely so someone can read and copy what was submitted.

  `readOnly` now puts `readonly` on text inputs and textareas, with
  `aria-readonly`. Controls HTML defines no `readonly` for — select, checkbox,
  radio, file — keep `disabled` and gain `aria-readonly`. Collection actions stay
  `disabled`: they are actions, not values. Submission is neutralised under
  `readOnly`, which it was not before.

  `disabled` is now a distinct prop meaning _unavailable_, rendering `disabled`
  throughout, and is no longer a synonym for `readOnly`.

### Patch Changes

- Updated dependencies [0031564]
  - @streamline-pulse/formkrafter-wc@0.20.0

## 0.19.0

### Minor Changes

- 2b1c1d6: Accept `disabled` alongside `readOnly`

  `fk-form-render` takes a `disabled` prop with the same effect as `readOnly`.
  Both render every control with the HTML `disabled` attribute, never `readonly`:
  `readonly` has no meaning on a select, a checkbox or a radio, so honouring the
  HTML distinction would lock text fields one way and everything else another.
  Layout and navigation stay interactive either way.

### Patch Changes

- Updated dependencies [2b1c1d6]
  - @streamline-pulse/formkrafter-wc@0.19.0

## 0.18.1

### Patch Changes

- 691ede3: Propagate readOnly into collection rows

  `readOnly` reached every brick except those inside a `collection`: the grid
  locked its own chrome because it receives `disabled`, but the `fk-brick-render`
  it instantiates per row got no `readOnly` at all and fell back to `false`. A
  form declared read-only accepted typing in any grid cell, at any nesting depth,
  including a collection inside a collection.

  `fk-data-grid` takes a `readOnly` prop and passes it to every row. The stray
  row-level delete button that stayed active came from the same gap and is covered
  by the same fix.

  The React Native grid already forwarded `disabled` to its rows and was never
  affected.

- Updated dependencies [691ede3]
  - @streamline-pulse/formkrafter-wc@0.18.1

## 0.18.0

### Minor Changes

- 7ebaee6: Materialize configs.defaultValue into form data

  `defaultValue` was written by the Form.io converter and read by nothing: no
  brick displayed it and it never entered the form data, so a defaulted field
  rendered empty and a `required` one failed validation until the user retyped
  the value that was supposed to be there already.

  Both renderers now seed their data from the spec's defaults on load, on a spec
  change, and after nested forms expand. Host `data` always wins per key, so
  passing a value for a defaulted field still overrides it. Defaults inside a
  collection stay out: those belong to a row, not to the form.

  `defaultFormData(spec)` is exported for hosts that need the same seed
  server-side.

- c4e444f: Build a form screen without touching a ref

  `fk-form-render` gains a `validityChange` event, emitted on first render and on
  every change with the full verdict. Binding a host button's `disabled` to it
  needs no ref and no `validate()` call — the standard screen loses its imperative
  plumbing.

  Also: `submit()` as a public method (validates, emits `formSubmit` only when
  valid, returns the verdict either way), `readOnly` to render every control
  disabled and hide the built-in action, and `showSubmit` / `submitLabel` for
  screens that want no external button at all.

  `fk-form-render` is also a form-associated custom element: it participates in a
  surrounding `<form>`, so an external `<button type="submit" form="…">` drives it
  through the platform, `checkValidity()` reflects the form's state, and the
  submitted value is exposed through `setFormValue`. Where `ElementInternals` is
  missing the element behaves exactly as before.

  Required fields are finally marked: an asterisk next to the label, a
  screen-reader-only "(required)", and `aria-required` on the control. Nothing
  distinguished them before, visually or for assistive technology.

### Patch Changes

- e1fc027: Evaluate visibility rules against context when validating

  Validation resolved hidden bricks from the submitted payload alone. A rule
  reading a value that lives in `context` saw nothing, concluded the brick was
  hidden and dropped its errors — so a field the renderer displays because of that
  context validated as absent, and `validate()` answered valid on a visibly empty
  required field.

  `validateBrickSpecDataDetailed` and `validateFormData` take an optional rule
  scope, kept separate from the data being validated so context never becomes part
  of the payload. The renderer passes its merged map. Backends validating a spec
  whose rules read context should pass the same scope as the fourth argument.

  Bricks hidden by a rule reading form data were already excluded; only the
  context path was blind.

- Updated dependencies [7ebaee6]
- Updated dependencies [c4e444f]
- Updated dependencies [e1fc027]
  - @streamline-pulse/formkrafter-wc@0.18.0

## 0.17.1

### Patch Changes

- 23c3cab: Publish siblings pinned to the version they were built against

  Every release since 0.13 published its internal dependencies frozen at whatever
  `bun.lock` last recorded: `formkrafter-react@0.17.0` depended on
  `formkrafter-wc@0.15.1`, which depended on `formkrafter-core@0.15.1`. Installing
  0.17.0 therefore ran 0.15.1 internals — the enveloped option responses and the
  `context` prop were unreachable, and the generated React types pointed at the
  older component surface.

  `bun publish` resolves `workspace:*` from the lockfile rather than from each
  package.json, and `bun install` never rewrote the versions it records there.
  The version pipeline now syncs them, and CI fails the release if they drift.

  Consumers pinning `formkrafter-wc` / `formkrafter-core` through package manager
  overrides can drop them.

- Updated dependencies [23c3cab]
  - @streamline-pulse/formkrafter-wc@0.17.1

## 0.17.0

### Minor Changes

- 8c70ae9: Remote option envelopes, runtime context, and formSubmit now implies valid

  `dataSourceService.fetchOptions` accepted a bare JSON array and threw on
  anything else, so every paginated API — `{ data: [...], page, total }` — failed
  with _"Data source did not return an array"_ despite a correct 200. A payload
  whose `data` property is an array is now unwrapped automatically, and
  `optionsPath` addresses any other envelope with a dotted path. A payload
  matching neither still throws loudly: the point was never to coerce silently.

  `fk-form-render` and `fk-form-builder` take a `context` prop: host-supplied
  runtime values — an API host, a tenant plan, a token — that rules and
  `optionsUrl` / `optionsHeaders` interpolation read alongside the form data,
  `context` winning on a name clash. Nothing in it is validated, written by a
  value effect, or emitted in `formDataChange` / `formSubmit`. `FormRenderer` in
  `formkrafter-react-native` takes the same prop.

  The `_`-prefix convention still works and stays supported.

  Interpolation tokens accept dotted paths, so nested context needs no
  flattening: `{api.base}/employees?dept={department}`. A key containing a dot is
  matched before the path is walked, inherited properties stay unreachable, and a
  token resolving to nothing is still an empty string — existing flat templates
  are unchanged.

  `formSubmit` no longer fires when the form is invalid. It previously emitted
  unconditionally after its validation pass, carrying `isValid: false`, which
  forced hosts to re-validate defensively. Anything relying on being notified of
  a rejected submission should listen to `formDataChange`, which still reports
  every verdict.

### Patch Changes

- Updated dependencies [8c70ae9]
  - @streamline-pulse/formkrafter-wc@0.17.0

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

### Patch Changes

- Updated dependencies [40aa70f]
  - @streamline-pulse/formkrafter-wc@0.16.0

## 0.15.2

### Patch Changes

- @streamline-pulse/formkrafter-wc@0.15.2

## 0.15.1

### Patch Changes

- @streamline-pulse/formkrafter-wc@0.15.1

## 0.15.0

### Patch Changes

- @streamline-pulse/formkrafter-wc@0.15.0

## 0.14.0

### Patch Changes

- Updated dependencies [b9ea5c5]
  - @streamline-pulse/formkrafter-wc@0.14.0

## 0.13.4

### Patch Changes

- @streamline-pulse/formkrafter-wc@0.13.4

## 0.13.3

### Patch Changes

- @streamline-pulse/formkrafter-wc@0.13.3

## 0.13.2

### Patch Changes

- @streamline-pulse/formkrafter-wc@0.13.2

## 0.13.1

### Patch Changes

- Updated dependencies [c9622ff]
  - @streamline-pulse/formkrafter-wc@0.13.1

## 0.13.0

### Patch Changes

- @streamline-pulse/formkrafter-wc@0.13.0

## 0.12.0

### Patch Changes

- @streamline-pulse/formkrafter-wc@0.12.0

## 0.11.1

### Patch Changes

- @streamline-pulse/formkrafter-wc@0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [725a38d]
  - @streamline-pulse/formkrafter-wc@0.11.0

## 0.10.1

### Patch Changes

- @streamline-pulse/formkrafter-wc@0.10.1

## 0.10.0

### Patch Changes

- @streamline-pulse/formkrafter-wc@0.10.0

## 0.9.0

### Patch Changes

- @streamline-pulse/formkrafter-wc@0.9.0

## 0.8.0

### Patch Changes

- @streamline-pulse/formkrafter-wc@0.8.0

## 0.7.1

### Patch Changes

- Updated dependencies [875af29]
  - @streamline-pulse/formkrafter-wc@0.7.1

## 0.7.0

### Patch Changes

- @streamline-pulse/formkrafter-wc@0.7.0

## 0.6.2

### Patch Changes

- Updated dependencies [21d3d6b]
- Updated dependencies [ca17618]
  - @streamline-pulse/formkrafter-wc@0.6.2

## 0.6.1

### Patch Changes

- Updated dependencies [c88f6a4]
  - @streamline-pulse/formkrafter-wc@0.6.1

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
