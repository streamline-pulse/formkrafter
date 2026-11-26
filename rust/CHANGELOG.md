# Changelog

## 0.1.0

First release, following `@streamline-pulse/formkrafter-core` 0.38.2.

- Validation schema, form data validation with error details, lint, default messages, JsonLogic rules and
  identifier checks (national and tax numbers, IBAN, plates, company registries, MRZ), at parity with the core
  through the shared fixtures in `parity/`.
- A schema that does not compile returns `ValidateError::SchemaInvalid` instead of accepting every submission.
- `assert_supported` refuses `pattern` validations Rust's `regex` cannot run (look-around, backreferences).
- An `mrz` value without a readable zone (`raw`) is invalid.
- Patterns follow JavaScript's `RegExp`: `.`, `\s`, `\b`, class escapes, `[]`/`[^]`, `\0`, `\cX`.
