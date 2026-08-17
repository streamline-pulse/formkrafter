---
"@streamline-pulse/formkrafter-core": patch
"@streamline-pulse/formkrafter-wc": patch
"@streamline-pulse/formkrafter-react": patch
"@streamline-pulse/formkrafter-vue": patch
"@streamline-pulse/formkrafter-react-native": patch
---

Evaluate visibility rules against context when validating

Validation resolved hidden bricks from the submitted payload alone. A rule
reading a value that lives in `context` saw nothing, concluded the brick was
hidden and dropped its errors — so a field the renderer displays because of that
context validated as absent, and `validate()` answered valid on a visibly empty
required field.

`validateBrickSpecDataDetailed` and `validateFormData` take an optional rule
scope, kept separate from the data being validated so context never becomes part
of the payload. The renderer passes its merged map. Backends validating a spec
whose rules read context should pass the same scope as the fourth argument.

Bricks hidden by a rule reading form data were already excluded; only the
context path was blind.
