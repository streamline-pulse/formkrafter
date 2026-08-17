---
"@streamline-pulse/formkrafter-react-native": minor
---

Bring the native renderer up to the web surface

`FormRenderer` takes `readOnly`, `FormEngine` accepts an `onValidityChange`
callback fired on construction and on every change, and required fields carry an
asterisk plus a spoken "(required)" in their accessibility label.

Native bricks now receive their `validations`, which the walker never passed
before — that is what made a required marker impossible.
