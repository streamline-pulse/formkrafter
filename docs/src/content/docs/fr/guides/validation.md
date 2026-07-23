---
title: Validation
description: Validateurs déclaratifs, validateurs custom sandboxés, et verdicts identiques côté frontend et backend.
---

Les validations vivent sur chaque brick et se compilent en JSON Schema (Ajv + ajv-errors + ajv-formats) :

| Validateur | S'applique à | Paramètre |
|---|---|---|
| `required` | tous | — |
| `minLength` / `maxLength` / `pattern` / `email` / `url` | string | nombre / regex |
| `min` / `max` | number | nombre |
| `minItems` / `maxItems` | array | nombre |
| `custom` | tous | JavaScript (sandboxé) |

```json
{
  "validations": [
    { "validator": "required" },
    { "validator": "custom",
      "customValidator": "return value !== dataMap.oldEmail || 'Doit différer de l’ancien';" }
  ]
}
```

Dans un validateur custom, `value` est la valeur de la brick et `dataMap` le formulaire entier. Retournez `true` (ou rien) pour passer, une chaîne pour échouer avec ce message, ou `false` pour échouer avec le message configuré/par défaut.

## Messages et locales

Les messages se résolvent en cascade : le message de l'auteur (optionnellement localisé `{ en: …, fr: … }`) → les défauts localisés intégrés. L'anglais et le français sont fournis ; ajoutez d'autres langues avec `registerValidationMessages('de', { … })`.

## Le même verdict côté backend

```ts
import { validateFormData } from '@streamline-pulse/formkrafter-core'

const { valid, errors } = validateFormData(spec, payload, 'fr')
// errors: { name: 'Ce champ est obligatoire', 'contacts[0].email': 'Email invalide' }
```

`validateFormData` applique exactement la sémantique du frontend :

- les lignes de collections se valident individuellement et se rapportent en `key[index].field` ;
- les chaînes vides comptent comme absentes (donc `required` se comporte de façon cohérente) ;
- les champs cachés par des [règles](/formkrafter/fr/guides/rules/) sont **exclus** — un champ requis conditionnellement caché ne bloque jamais un submit dont il ne fait pas partie.
