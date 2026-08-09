# @streamline-pulse/formkrafter-react-native

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
