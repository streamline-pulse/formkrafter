# @streamline-pulse/formkrafter-react-native

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
