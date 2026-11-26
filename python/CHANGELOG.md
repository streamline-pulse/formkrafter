# Changelog

## Unreleased

Follows `@streamline-pulse/formkrafter-core` 0.38.2.

- A schema that does not compile raises `SchemaInvalid` instead of accepting every submission.
- An `mrz` value without a readable zone (`raw`) is invalid; the core now agrees.
- Patterns follow JavaScript's `RegExp`: `.`, `\s`, `\b`, class escapes, `[]`/`[^]`, `\cX`.
- `Number("0x+1")` and `Number("0x1_0")` are NaN; JsonLogic indexes strings by UTF-16 units.
- An effect without target is keyed `"undefined"`, as in the core.
- `as_spec`, `configs_of` and `JavaScriptMode` are exported, like the Rust crate.
- The parity fixtures moved to `parity/` at the repository root, shared with the Rust port.

## 0.2.0

Follows `@streamline-pulse/formkrafter-core` 0.33.0.

- JsonLogic rules: `formkrafter.jsonlogic` evaluates them as `json-logic-js` does. A field that rules hide is
  not checked, as in the browser. `validate_form_data` takes a `rule_scope` for the variables rules read.
- Identifiers: `national-id`/`tax-id` formats, `iban`, `vehicle-plate`, `company-registry` and `mrz` are
  validated. The checks are public too (`check_identity`, `check_plate`, `parse_mrz`…).
- The server re-reads an MRZ instead of trusting the stored `valid` flag.
- `SpecNotSupported` is now raised only where JavaScript decides the verdict.
- Error details name identifier formats: `{"validator": "identity", "value": "bj-ifu"}`.

## 0.1.0

First release, following core 0.33.0: validation schema, form data validation with error details, lint,
messages, Pydantic models and `formkrafter.testing`.
