# formkrafter

FormKrafter for Rust backends. The server validates a submission with the same spec the browser renders, and
reaches the same verdict: same error keys (`items[0].hs_code`), same messages, same warnings as
[`@streamline-pulse/formkrafter-core`](../packages/core).

```toml
[dependencies]
formkrafter = "0.1"
```

```rust
let result = formkrafter::validate_form_data(&spec, &formkrafter::js::Js::from_json(&payload), Some("fr"), None)?;
if !result.valid {
    // {"items[0].declared_value": "Minimum 0", "origin": "Ce champ est obligatoire"}
    return result.errors;
}
```

## What it does

| Function | Core equivalent |
|---|---|
| `build_validation_schema(spec, locale)` | `buildValidationSchema`: the same Ajv schema, key for key |
| `validate_form_data(spec, data, locale, rule_scope)` | `validateFormData`: empty strings and nulls count as missing, collections are validated row by row, fields hidden by rules are not checked |
| `lint_spec(spec)` | `lintSpec`: keyless inputs, validations without a dataType, duplicate keys, empty collections |
| `register_validation_messages(locale, messages)` | `registerValidationMessages` |
| `jsonlogic::apply(logic, data)` | `jsonLogic.apply` from `json-logic-js` 2.0.5, JavaScript coercions included |
| `get_affected_properties(rules, data)`, `is_rule_active`, `hidden_keys(spec, data)` | `getAffectedProperties` and the hidden walk of the validator |
| `check_identity(format, value)`, `check_iban`, `format_iban` | `checkIdentity`, `checkIban`, `formatIban` (NIR, NPI, SIREN, SIRET, IFU, IBAN, `digits-<n>`) |
| `check_plate`, `format_plate`, `check_company_registry`, `format_company_registry` | same names (plates FR/BJ/CI/SN, RCCM OHADA, RCS) |
| `IDENTITY_FORMATS`, `PLATE_FORMATS`, `REGISTRY_FORMATS` | the format tables the builder lists |
| `parse_mrz(text, today)` | `parseMrz`: TD3 passports and TD1 identity cards, every check digit |

`validate_form_data` returns a `ValidationResult`:

- `valid`, `errors` (key → message, in the core's order) and `warnings`, as in the browser; `to_dict()` gives the
  core's shape;
- `details` (key → `ErrorDetail { validator, message, value }`), so an API can return a stable code and let the
  client word it.

Errors are one enum where Python raises separate exceptions:

| Python | Rust |
|---|---|
| `SpecNotSupported` | `ValidateError::SpecNotSupported` |
| `SchemaInvalid` | `ValidateError::SchemaInvalid` |
| `JavaScriptRule`, `JsonLogicError` | `ValidateError::Rule(RuleError::JavaScript \| RuleError::JsonLogic)` |

Python also ships `models` (Pydantic specs) and `testing` (comparison with the core through Node); the Rust
crate has no counterpart yet.

Specs and samples are plain `serde_json::Value`; data and rule scope use `js::Js`, the port's JavaScript value
(`Js::from_json` converts). `Js` adds `undefined` and non-finite numbers to JSON, because JsonLogic produces
both.

### Supported

- **Validations:** `required`, `min`/`max`, `minLength`/`maxLength`, `pattern`, `minItems`/`maxItems`, `email`, `url`.
- **Bricks:** panels, inputs, selects (multiple included), collections (data grids, nested at any depth), outputs.
  On top of those:
  - `national-id` and `tax-id` check their `idFormat`, `iban` its key;
  - `vehicle-plate` and `company-registry` check their format;
  - `date-range` must not end before it starts;
  - `mrz` must hold a readable zone whose check digits match.
- **Rules:** JsonLogic rules are evaluated on the submitted data (plus `rule_scope`): a field they hide is not
  checked, as in the browser. Rules that only disable, prefill or require never change the verdict, whatever
  their language.

An `mrz` value must carry its zone (`raw`), and the zone must read with matching check digits: a bare
`valid` flag does not pass, in the browser or on the server.

One deliberate difference: a schema Ajv refuses to compile makes the browser enforce no rule (with a warning).
The server returns `ValidateError::SchemaInvalid` instead of accepting everything. An `idFormat`,
`plateFormat` or `registryFormat` the core does not know is one such case.

The details that usually make a port drift are reproduced:

- Ajv's `email` and `uri` formats, copied verbatim;
- the browser's `RegExp`: `$` never matches before a trailing newline, `.` stops at every line terminator,
  `\d`, `\w` and `\b` are ASCII, `\s` is JavaScript's whitespace, and `[`, `&`, `~` are literal in a class;
- `String(1e-7)` is `1e-7`;
- the core compares lengths in code points;
- JsonLogic's `==`, `<` and `+` coerce like JavaScript (`"1" == 1`, `[2] < 10`), and `[]` is falsy.

### Refused

JavaScript never runs server-side. `validate_form_data` returns `SpecNotSupported` rather than half-validating a
spec where JavaScript decides the verdict:

- **custom validators** (`validator: "custom"`): move the check to the server, or to a declarative validation;
- **JavaScript rules, or `code` effects, that hide data-carrying fields**: write the condition in JsonLogic;
- **`pattern` validations Rust's `regex` cannot run** (look-around, backreferences): rewrite the pattern, or
  split it into several `pattern` validations.

JavaScript rules that hide nothing (a `disabled` effect, a note) are accepted.

`build_validation_schema` and `lint_spec` work on every spec. `assert_supported(spec)` checks up front, for
instance in the tests that cover the specs a backend serves.

## Parity with the core

`parity/` holds specs, data samples and the verdicts the core gives them, shared with the Python
port. The core writes the fixtures:

```bash
bun scripts/parity.ts             # from the repository root: rewrites parity/expected.json
cargo test                        # from rust/: the port must reach the same schemas, lint issues and verdicts
```

CI regenerates the fixtures and fails when they are stale, so a change in the core shows up in the Rust tests.
`formkrafter::CORE_VERSION` names the core release a version follows.
