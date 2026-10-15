---
"@streamline-pulse/formkrafter-core": minor
"@streamline-pulse/formkrafter-wc": minor
"@streamline-pulse/formkrafter-react": minor
"@streamline-pulse/formkrafter-vue": minor
"@streamline-pulse/formkrafter-react-native": minor
---

**Finance bricks.** `tax-id` checks a tax identifier by `idFormat` (`bj-ifu`,
`fr-siren` and `fr-siret` with their Luhn key, `digits-<n>`), `iban` checks an
IBAN with ISO 7064 mod 97-10 and groups it by four, `money` stores
`{ amount, currency }` with the currency picked among the ones the builder
offers. The core exposes `checkLuhn`, `checkFrSiren`, `checkFrSiret`,
`checkBjIfu`, `checkIban` and `formatIban`; new `Finance` category.
