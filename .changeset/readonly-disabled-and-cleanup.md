---
"@streamline-pulse/formkrafter-wc": minor
"@streamline-pulse/formkrafter-react": minor
"@streamline-pulse/formkrafter-vue": minor
"@streamline-pulse/formkrafter-react-native": minor
---

Accept `disabled` alongside `readOnly`

`fk-form-render` takes a `disabled` prop with the same effect as `readOnly`.
Both render every control with the HTML `disabled` attribute, never `readonly`:
`readonly` has no meaning on a select, a checkbox or a radio, so honouring the
HTML distinction would lock text fields one way and everything else another.
Layout and navigation stay interactive either way.
