# @streamline-pulse/formkrafter-react

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
