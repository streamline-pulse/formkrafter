---
"@streamline-pulse/formkrafter-core": minor
"@streamline-pulse/formkrafter-wc": minor
"@streamline-pulse/formkrafter-react": minor
"@streamline-pulse/formkrafter-vue": minor
---

Nested forms: reference a form inside another form.

- New `nested-form` brick: point it at another spec through its `specRef` config (editable in the property panel). At render time the referenced form is resolved and inlined as a labelled group — fields, validations and rules included.
- New `services.specSourceService` (default: `FetchSpecSourceService`, fetches the ref as a URL with optional `baseUrl`/headers/credentials and caching) — override it to load specs from your own store.
- New core APIs `expandSpec(spec, options?)` and `hasNestedForms(spec)`: the async expansion pass inlines every reference (cycle detection, configurable depth limit) and returns a plain spec that the whole synchronous pipeline — validation, rules, recap, backend `validateFormData` — consumes unchanged.
- `fk-form-render` expands automatically, with a loading state and an inline alert when a reference cannot be resolved.
- The Form.io converter maps `form` components to `nested-form` bricks (their reference kept as `specRef`).
