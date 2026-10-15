---
"@streamline-pulse/formkrafter-core": minor
"@streamline-pulse/formkrafter-wc": minor
"@streamline-pulse/formkrafter-react": minor
"@streamline-pulse/formkrafter-vue": minor
"@streamline-pulse/formkrafter-react-native": minor
---

**Identity bricks.** `national-id` is a text field whose check comes from its
`idFormat`: `fr-nir` (French social security number with its key), `bj-npi`
(Benin, 10 digits) or `digits-<n>`; the core exposes `checkIdentity` and
registers one ajv format per rule. `mrz` reads the machine-readable zone of a
passport (TD3) or identity card (TD1) pasted into it: `parseMrz` extracts the
document number, nationality, names, dates and sex, verifies every ICAO 9303
check digit, and the stored object carries `valid` / `errors`, which the
validation schema enforces through a new `mrzValid` keyword. New `Identity`
category and `mrz.*` translations.
