---
"@streamline-pulse/formkrafter-core": minor
"@streamline-pulse/formkrafter-wc": minor
"@streamline-pulse/formkrafter-react": minor
"@streamline-pulse/formkrafter-vue": minor
"@streamline-pulse/formkrafter-react-native": minor
---

**`collectFields` lists what a form collects.** Backends and assistants that
read or fill submissions had to walk specs themselves and got the field key
wrong (`configs.name` instead of `configs.key`) or missed the options of a
select. `collectFields(spec, locale)` now returns every input and collection
with its key, resolved label, brick id, data type, static options,
requiredness and, for a collection, the columns of one row.
