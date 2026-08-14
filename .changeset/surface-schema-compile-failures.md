---
'@streamline-pulse/formkrafter-core': patch
---

A validation schema that fails to compile no longer disables validation
silently. `compiledValidator` swallowed the error and returned no
validator, so `validateFormData` answered `valid: true` for every
payload — a fail-open that hid a duplicated ajv instance in a consuming
app for as long as it took to notice submissions were never rejected.
The failure now surfaces through the `warnings` channel alongside the
reason.
