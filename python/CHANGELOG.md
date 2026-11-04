# Changelog

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
