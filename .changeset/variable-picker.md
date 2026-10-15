---
"@streamline-pulse/formkrafter-core": minor
"@streamline-pulse/formkrafter-wc": minor
"@streamline-pulse/formkrafter-react": minor
"@streamline-pulse/formkrafter-vue": minor
---

**Template variables suggested while typing.** When the form context carries
`_variables` (`{ name, label? }[]`), text and text-area fields open a list as
soon as `{{` is typed, filter it with the following characters and insert
`{{name}}` on Enter or click (new `fk-variable-picker` element, `variables:
false` on a brick opts it out, password fields are never suggested). The core
gains the `variables.empty` translation.
