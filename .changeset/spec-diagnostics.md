---
'@streamline-pulse/formkrafter-core': minor
---

New `lintSpec(spec)` reports the spec mistakes that fail silently:
validations declared on a brick with no `dataType` (they are skipped
entirely, client and server), data-carrying bricks without a `key`,
duplicate keys colliding in the form data, and collections with no row
template. `validateFormData` now also returns `warnings` when it had to
skip validations that way, so the failure stops being invisible.
