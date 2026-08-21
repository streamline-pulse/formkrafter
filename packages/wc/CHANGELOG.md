# @streamline-pulse/formkrafter-wc

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

  - @streamline-pulse/formkrafter-core@0.18.1

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
  - @streamline-pulse/formkrafter-core@0.18.0

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
  - @streamline-pulse/formkrafter-core@0.17.1

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
  - @streamline-pulse/formkrafter-core@0.17.0

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
  - @streamline-pulse/formkrafter-core@0.16.0

## 0.15.2

### Patch Changes

- Updated dependencies [442868b]
  - @streamline-pulse/formkrafter-core@0.15.2

## 0.15.1

### Patch Changes

- Updated dependencies [53196e1]
  - @streamline-pulse/formkrafter-core@0.15.1

## 0.15.0

### Patch Changes

- Updated dependencies [124eb56]
  - @streamline-pulse/formkrafter-core@0.15.0

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

### Patch Changes

- Updated dependencies [b9ea5c5]
  - @streamline-pulse/formkrafter-core@0.14.0

## 0.13.4

### Patch Changes

- Updated dependencies [fb4b1ce]
  - @streamline-pulse/formkrafter-core@0.13.4

## 0.13.3

### Patch Changes

- @streamline-pulse/formkrafter-core@0.13.3

## 0.13.2

### Patch Changes

- @streamline-pulse/formkrafter-core@0.13.2

## 0.13.1

### Patch Changes

- c9622ff: Text on primary-colored buttons now uses the surface token instead of
  hardcoded white: on the dark theme the primary is a light teal and white
  text sat at 2.4:1 — the surface color reads at 7.3:1 dark and keeps the
  exact same look in light. Found by extending the axe scan to the dark
  scheme, which now runs in CI.
  - @streamline-pulse/formkrafter-core@0.13.1

## 0.13.0

### Patch Changes

- @streamline-pulse/formkrafter-core@0.13.0

## 0.12.0

### Patch Changes

- @streamline-pulse/formkrafter-core@0.12.0

## 0.11.1

### Patch Changes

- @streamline-pulse/formkrafter-core@0.11.1

## 0.11.0

### Minor Changes

- 725a38d: `fk-form-builder` gains a `locale` prop for its own chrome language:
  paired with `setFkTranslations`, the toolbar, palette and property panel
  re-render on a language switch without remounting the builder — which
  used to be the only way, wiping the form being built. Distinct from
  `editLocale`, the content language being edited.

### Patch Changes

- @streamline-pulse/formkrafter-core@0.11.0

## 0.10.1

### Patch Changes

- Updated dependencies [91b49e8]
  - @streamline-pulse/formkrafter-core@0.10.1

## 0.10.0

### Patch Changes

- Updated dependencies [e5b0da3]
  - @streamline-pulse/formkrafter-core@0.10.0

## 0.9.0

### Patch Changes

- Updated dependencies [2c9e8de]
  - @streamline-pulse/formkrafter-core@0.9.0

## 0.8.0

### Patch Changes

- @streamline-pulse/formkrafter-core@0.8.0

## 0.7.1

### Patch Changes

- 875af29: Default bricks no longer clobber application overrides. Registering your
  own version of a built-in brick — a UI-kit skin, for example — before the
  first component mounts now survives the default registration, regardless
  of order.
  - @streamline-pulse/formkrafter-core@0.7.1

## 0.7.0

### Patch Changes

- Updated dependencies [66d9d05]
  - @streamline-pulse/formkrafter-core@0.7.0

## 0.6.2

### Patch Changes

- 21d3d6b: Accessibility fixes surfaced by an axe audit: the builder's locale select
  now carries an accessible name (new `builder.editLocale` translation), the
  custom select combobox exposes the brick label through a new
  `accessibleLabel` prop on `fk-select-input`, and the default light-theme
  primary darkens from #328f97 to #2b7a81 so white-on-primary text meets the
  WCAG AA 4.5:1 contrast ratio.
- ca17618: Extend the host-styling hardening from border-radius to typography: toolbar
  buttons and tabs now pin `text-transform` and `letter-spacing`, and field
  wrappers pin `font-style` and `text-decoration`, so global `button`/`label`
  rules in the host application no longer distort the chrome.
  - @streamline-pulse/formkrafter-core@0.6.2

## 0.6.1

### Patch Changes

- c88f6a4: Harden tab buttons against host-page button styling. The components are
  scoped rather than shadow-DOM, so a global `button { border-radius: … }`
  rule in the host application leaked into the property-panel tabs and the
  tabs layout brick. Both now declare their radius explicitly.
  - @streamline-pulse/formkrafter-core@0.6.1

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

### Patch Changes

- da9712f: Fix the built-in bricks disappearing when an app registers a custom brick.

  `<fk-form-render>` and `<fk-form-builder>` only registered the 30 built-in
  bricks when the registry was empty. Registering a custom brick at startup —
  the flow the docs recommend — left the registry non-empty, so the built-ins
  never registered and every spec rendered `Brick panel:column not found`, with
  only the custom brick left in the palette.

  The components now always call `registerDefaultBricks()`, which is idempotent:
  it tracks whether the defaults are already in place through a `globalThis`
  flag, mirroring how the registry itself is shared across bundle copies.

- Updated dependencies [5599714]
  - @streamline-pulse/formkrafter-core@0.6.0

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

  - @streamline-pulse/formkrafter-core@0.5.1

## 0.5.0

### Minor Changes

- 0b2cf38: Slimmer specs for option-heavy forms:

  - `convertFormioForm` now emits static options as a compact newline string whenever every option's label equals its value (the common case in Form.io exports) — real production specs shrink up to 4× vs the Form.io definition. Lists where labels differ keep the `{ label, value }` object form.
  - The converter warns when a component embeds more than 100 static options, recommending a remote source or a shared catalog.
  - New `catalog` options source for select/multi-select: set `optionsRef` and the options are resolved through the new `services.optionSourceService` (default `FetchOptionSourceService`: treats the ref as a URL, supports `baseUrl`, headers, credentials and per-URL caching). Store a big list once, reference it from any number of forms.

### Patch Changes

- c31d1c9: `fk-form-render` now registers the default bricks itself when the registry is empty. Previously a page using only the renderer (without `fk-form-builder`) displayed "Brick … not found" until something else registered the bricks.
- Updated dependencies [0b2cf38]
  - @streamline-pulse/formkrafter-core@0.5.0

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

- d886a52: Slimmer npm package: 6.7 MB → 2.0 MB unpacked (195 → 115 files).

  The package now ships only what its three consumption paths use: `dist/components` (bundlers, the `"."` export), `dist/formkrafter-wc` (CDN script-tag + `styles.css`) and `dist/types`. The duplicate `dist/esm`, `dist/cjs`, `dist/collection` outputs and the legacy `./loader` entry are no longer published — same components, same features, different packaging only. If you consumed the package from CommonJS `require()`, switch to `import` (the package is now ESM-only).

### Patch Changes

- Updated dependencies [da442d9]
- Updated dependencies [9f48150]
- Updated dependencies [a7b15b8]
  - @streamline-pulse/formkrafter-core@0.4.0

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
  - @streamline-pulse/formkrafter-core@0.3.0

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
  - @streamline-pulse/formkrafter-core@0.2.0

## 0.1.1

### Patch Changes

- Fix internal dependency ranges: 0.1.0 was published with workspace dependencies resolved to the non-existent 0.0.1 (stale lockfile at publish time). No code changes.
- Updated dependencies
  - @streamline-pulse/formkrafter-core@0.1.1

## 0.1.0

### Minor Changes

- Initial public release of FormKrafter: framework-agnostic drag & drop form builder.

  - `formkrafter-core`: form specs, RFC 6902 ops with undo/redo, Ajv validation with localized messages, sandboxed rules engine (no eval), backend `validateFormData`, injectable services.
  - `formkrafter-wc`: Stencil web components — `fk-form-builder`, `fk-form-render`, 27 built-in bricks, theming via `--fk-*` tokens with dark mode, builder chrome i18n (en/fr), remote selects with auth-aware headers.
  - `formkrafter-react` / `formkrafter-vue`: generated bindings for the web components.

### Patch Changes

- Updated dependencies
  - @streamline-pulse/formkrafter-core@0.1.0
