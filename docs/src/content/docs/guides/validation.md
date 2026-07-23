---
title: Validation
description: Declarative validators, custom sandboxed validators, and identical verdicts on the frontend and backend.
---

Validations live on each brick and compile to a JSON Schema (Ajv + ajv-errors + ajv-formats):

| Validator | Applies to | Parameter |
|---|---|---|
| `required` | all | — |
| `minLength` / `maxLength` / `pattern` / `email` / `url` | string | number / regex |
| `min` / `max` | number | number |
| `minItems` / `maxItems` | array | number |
| `custom` | all | JavaScript (sandboxed) |

```json
{
  "validations": [
    { "validator": "required" },
    { "validator": "custom",
      "customValidator": "return value !== dataMap.oldEmail || 'Must differ from the old one';" }
  ]
}
```

Inside a custom validator, `value` is the brick's own value and `dataMap` is the whole form. Return `true` (or nothing) to pass, a string to fail with that message, or `false` to fail with the configured/default message.

## Messages and locales

Messages resolve in cascade: the author's message (optionally localized `{ en: …, fr: … }`) → built-in localized defaults. English and French ship out of the box; add more with `registerValidationMessages('de', { … })`.

## Same verdict on the backend

```ts
import { validateFormData } from '@streamline-pulse/formkrafter-core'

const { valid, errors } = validateFormData(spec, payload, 'fr')
// errors: { name: 'Ce champ est obligatoire', 'contacts[0].email': 'Email invalide' }
```

`validateFormData` applies the exact frontend semantics:

- collection rows validate individually and report as `key[index].field`;
- empty strings count as missing (so `required` behaves consistently);
- fields hidden by [rules](/formkrafter/guides/rules/) are **excluded** — a conditionally hidden required field never blocks a submit it isn't part of.
