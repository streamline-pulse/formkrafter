# formkrafter (Python)

FormKrafter for Python backends. The server validates a submission with the same spec the browser renders, and
reaches the same verdict: same error keys (`items[0].hs_code`), same messages, same warnings as
[`@streamline-pulse/formkrafter-core`](../packages/core).

```bash
pip install formkrafter            # no dependency
pip install "formkrafter[pydantic]"  # Pydantic models for specs built in code
```

```python
from formkrafter import validate_form_data

result = validate_form_data(spec, payload, locale="fr")
if not result.valid:
    # {"items[0].declared_value": "Minimum 0", "origin": "Ce champ est obligatoire"}
    return 422, result.errors
```

## What it does

| Function | Core equivalent |
|---|---|
| `build_validation_schema(spec, locale)` | `buildValidationSchema`: the same Ajv schema, key for key |
| `validate_form_data(spec, data, locale)` | `validateFormData`: empty strings and nulls count as missing, collections are validated row by row |
| `lint_spec(spec)` | `lintSpec`: keyless inputs, validations without a dataType, duplicate keys, empty collections |
| `register_validation_messages(locale, messages)` | `registerValidationMessages` |
| `default_form_data`, `iterate_bricks`, `iterate_schema_bricks`, `resolve_localized_text` | same names in camelCase |

`validate_form_data` returns a `ValidationResult`:

- `valid`, `errors` (key → message) and `warnings`, as in the browser; `to_dict()` gives the core's shape;
- `details` (key → `ErrorDetail(validator, message, value)`), so an API can return a stable code and let the
  client word it: `{"items[0].declared_value": {"validator": "min", "value": 0, "message": "Minimum 0"}}`.

Every function takes a plain dict or a `formkrafter.models.BrickSpec`.

### Supported

- **Validations:** `required`, `min`/`max`, `minLength`/`maxLength`, `pattern`, `minItems`/`maxItems`, `email`, `url`.
- **Bricks:** panels, inputs, selects (multiple included), collections (data grids, nested at any depth), outputs.
  On top of those, `date-range` must not end before it starts.
- **Rules:** rules that only disable, prefill or require a field are accepted. They do not change the verdict,
  in the browser either.

The details that usually make a Python port drift are reproduced:

- Ajv's `email` and `uri` formats, copied verbatim;
- the browser's `RegExp`: `$` never matches before a trailing newline, and `\d` is ASCII;
- `String(1e-7)` is `1e-7`;
- the core compares lengths in code points;
- a schema Ajv refuses to compile enforces no rule (with a warning).

### Refused

`validate_form_data` raises `SpecNotSupported` rather than half-validating a spec that needs:

- **JavaScript custom validators** (`validator: "custom"`). They run in the browser's sandbox and are not executed
  server-side: move the check to the server, or to a declarative validation.
- **Rules that hide data-carrying fields.** A hidden field's errors are dropped in the browser. json-logic
  evaluation is planned.
- **The checks not ported yet:** identity numbers (`national-id`, `tax-id`, `iban`), `vehicle-plate`,
  `company-registry`, `mrz`.

`build_validation_schema` and `lint_spec` work on every spec. `assert_supported(spec)` checks up front, for
instance in the tests that cover the specs a backend serves.

## Parity with the core

`tests/parity/cases.json` holds specs and data samples. The core compiles and validates them:

```bash
bun scripts/python-parity.ts      # from the repository root: rewrites tests/parity/expected.json
uv run pytest                     # the port must reach the same schemas, lint issues and verdicts
```

CI regenerates the fixtures and fails when they are stale, so a change in the core shows up in the Python tests.
`formkrafter.CORE_VERSION` names the core release a version follows.

### In your own project

`formkrafter.testing` checks your specs against the real core, through Node and your web app's installed
`@streamline-pulse/formkrafter-core`:

```python
from formkrafter.testing import assert_matches_core

def test_served_forms_match_the_browser():
    assert_matches_core(SPEC, samples=[VALID, {}, {"items": []}], locales=["fr", "en"], node_project="../web")
```

`export_contract(spec, locales)` returns the spec with its schema per locale. Write it where your web tests read
it to assert that `buildValidationSchema(spec, locale)` gives the same.
