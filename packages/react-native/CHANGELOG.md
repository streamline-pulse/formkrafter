# @streamline-pulse/formkrafter-react-native

## 0.19.0

### Minor Changes

- 2b1c1d6: Accept `disabled` alongside `readOnly`

  `fk-form-render` takes a `disabled` prop with the same effect as `readOnly`.
  Both render every control with the HTML `disabled` attribute, never `readonly`:
  `readonly` has no meaning on a select, a checkbox or a radio, so honouring the
  HTML distinction would lock text fields one way and everything else another.
  Layout and navigation stay interactive either way.

### Patch Changes

- @streamline-pulse/formkrafter-core@0.19.0

## 0.18.1

### Patch Changes

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

- 4faed26: Bring the native renderer up to the web surface

  `FormRenderer` takes `readOnly`, `FormEngine` accepts an `onValidityChange`
  callback fired on construction and on every change, and required fields carry an
  asterisk plus a spoken "(required)" in their accessibility label.

  Native bricks now receive their `validations`, which the walker never passed
  before — that is what made a required marker impossible.

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

### Patch Changes

- Updated dependencies [b9ea5c5]
  - @streamline-pulse/formkrafter-core@0.14.0

## 0.13.4

### Patch Changes

- Updated dependencies [fb4b1ce]
  - @streamline-pulse/formkrafter-core@0.13.4

## 0.13.3

### Patch Changes

- 8d4fa0a: Rules now apply to bricks inside a data grid row: the grid rendered its
  rows through its own mini-walker, which looked bricks up in the registry
  but never resolved their rules — a field hidden or disabled by a rule
  showed up anyway, unlike the web grid. Row rendering now goes through
  the same renderBrick path as the form walker, so the two cannot drift.
  - @streamline-pulse/formkrafter-core@0.13.3

## 0.13.2

### Patch Changes

- cdef80d: Under react-native-web the date bricks now render the browser's native
  date, time and datetime-local inputs — the community picker does nothing
  on web — with the same stored formats. The signature pad follows the
  theme: surface background, text-colored ink, and the background is baked
  into the serialized SVG so a dark-theme signature stays readable wherever
  the stored image is displayed.
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

### Minor Changes

- fb9adc8: The signature brick arrives on a `formkrafter-react-native/signature`
  entry point (react-native-svg as an optional peer), storing a data URL
  like the web brick — image/svg+xml here. Every relative import in the
  package now carries its .js extension: the packed-tarball smoke test
  caught the entry points failing strict ESM resolution, the exact bug
  class the web wrappers hit before their fix.

### Patch Changes

- @streamline-pulse/formkrafter-core@0.13.0

## 0.12.0

### Minor Changes

- 7f53e78: Grid rows now count in the global validate() verdict — the engine
  validates through core's validateFormData, which descends into
  collection rows, and a validation epoch in the snapshot makes the grid
  surface every row error after a global validation. The tabs layout
  arrives with its validate-before-leaving gate. The file brick lands on a
  new `formkrafter-react-native/file` entry point backed by
  expo-document-picker as an optional peer, uploading through core's
  fileUploadService with the same stored shape as the web. Validation is
  also memoized per change instead of running twice per keystroke.

### Patch Changes

- @streamline-pulse/formkrafter-core@0.12.0

## 0.11.1

### Patch Changes

- 5168dcc: The engine and renderers now guard against a missing spec — during a
  Metro fast refresh the spec module can be undefined for one frame, and
  it used to reach core's WeakMap-backed validator caches and crash with
  "WeakMap key must be an Object". Same protection the web renderer always
  had.
  - @streamline-pulse/formkrafter-core@0.11.1

## 0.11.0

### Patch Changes

- @streamline-pulse/formkrafter-core@0.11.0

## 0.10.1

### Patch Changes

- Updated dependencies [91b49e8]
  - @streamline-pulse/formkrafter-core@0.10.1

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

### Patch Changes

- Updated dependencies [e5b0da3]
  - @streamline-pulse/formkrafter-core@0.10.0

## 0.9.0

### Minor Changes

- 2c9e8de: Six more native bricks: recap, content, hidden, tags, select boxes and
  address — 24 of the 30 web bricks now render natively. The recap
  summarization (`collectRecapItems`, `RecapItem`) moves from the wc brick
  into core so both renderers share the exact same walk; wc consumes it
  from there.

### Patch Changes

- Updated dependencies [2c9e8de]
  - @streamline-pulse/formkrafter-core@0.9.0

## 0.8.0

### Minor Changes

- 5cdd4b6: The native renderer now covers real production forms: a stepper wizard
  with per-step validation, step navigation gating and submit (ported from
  fk-stepper), radio and multi-select bricks, and date/time/datetime bricks
  on a dedicated `formkrafter-react-native/date` entry point backed by
  `@react-native-community/datetimepicker` as an optional peer — apps opt
  in with `registerNativeDateBricks()`, everyone else never resolves the
  native module.

### Patch Changes

- @streamline-pulse/formkrafter-core@0.8.0

## 0.7.1

### Patch Changes

- @streamline-pulse/formkrafter-core@0.7.1

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

### Patch Changes

- Updated dependencies [66d9d05]
  - @streamline-pulse/formkrafter-core@0.7.0
