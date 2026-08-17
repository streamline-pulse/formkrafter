---
"@streamline-pulse/formkrafter-core": minor
"@streamline-pulse/formkrafter-wc": minor
"@streamline-pulse/formkrafter-react": minor
"@streamline-pulse/formkrafter-vue": minor
"@streamline-pulse/formkrafter-react-native": minor
---

Materialize configs.defaultValue into form data

`defaultValue` was written by the Form.io converter and read by nothing: no
brick displayed it and it never entered the form data, so a defaulted field
rendered empty and a `required` one failed validation until the user retyped
the value that was supposed to be there already.

Both renderers now seed their data from the spec's defaults on load, on a spec
change, and after nested forms expand. Host `data` always wins per key, so
passing a value for a defaulted field still overrides it. Defaults inside a
collection stay out: those belong to a row, not to the form.

`defaultFormData(spec)` is exported for hosts that need the same seed
server-side.
