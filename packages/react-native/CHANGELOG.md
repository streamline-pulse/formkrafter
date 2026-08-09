# @streamline-pulse/formkrafter-react-native

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
