---
"@streamline-pulse/formkrafter-core": patch
---

Security: harden the JavaScript rule sandbox. Rule code could previously reach the host `Function` constructor through `Object.getOwnPropertyDescriptor` + `bind` (code execution on whatever host evaluates the rules, including servers running `validateFormData`) and pollute `Object.prototype` through `Object.assign`. Builtins are now frozen facades with an allowlist, methods are called from per-type allowlists, host functions can't be read or passed around, host arrays are read-only, native work is charged to the execution budget, string/array results are capped, and the budget is shared across nested calls.
