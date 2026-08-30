---
"@streamline-pulse/formkrafter-core": minor
---

Publish a JSON Schema for the form spec

`@streamline-pulse/formkrafter-core/schema/form-spec.schema.json` describes the
spec document: brick tree, validations, rules, configs. Draft 2020-12, usable
from any language and any editor with schema support.

It is kept in step with the code by tests rather than by discipline: the
enumerations are compared against the TypeScript unions they mirror, so adding a
validator or a brick type without updating the schema fails the build, and every
spec the Form.io converter emits is validated against it.
