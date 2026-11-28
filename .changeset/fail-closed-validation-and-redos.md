---
"@streamline-pulse/formkrafter-core": patch
---

Security: validation fails closed, and `pattern` validations can no longer hang the server.

A validation schema that does not compile (an invalid `pattern`, a `minLength` that is not a number, an unknown `idFormat`, in the spec or in a collection's row template) used to switch off every rule of its level, `required` included: `validateFormData` returned `valid: true` with a warning, and with no warning at all for a collection row. It now returns `valid: false` with one error under the new `SCHEMA_ERROR_KEY` (`"$schema"`) and the reason in `warnings`; `validateBrickSpecDataDetailed` and `validateBrickSpecData` refuse too. `validationSchemaFailure(spec)` returns the reason without data, to refuse such a spec when it is saved.

`pattern` validations ran on the native backtracking engine: on `^([a-zA-Z]+\s?)*$`, a 26-character value took over half a second and each extra character doubled it, in `validateFormData` on the server as in the browser. They now run on a linear-time matcher (`linearRegExp`, exported) with the same JavaScript syntax and meaning, lookahead included. In the rule sandbox, `match` and `search` take a regex literal only, no longer a string, so data cannot supply the pattern.

**Visible change to existing specs.** A spec whose schema does not compile now blocks submission instead of accepting everything. A `pattern` using a backreference (`\1`, `\k<name>`) or a lookbehind (`(?<=…)`, `(?<!…)`), or so large it compiles to more than 10 000 steps (`(a{100}){200}`), no longer compiles. Rule code calling `.match("…")` or `.search("…")` with a string throws; use a literal (`/…/`).
