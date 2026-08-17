---
"@streamline-pulse/formkrafter-core": minor
"@streamline-pulse/formkrafter-wc": minor
"@streamline-pulse/formkrafter-react": minor
"@streamline-pulse/formkrafter-vue": minor
"@streamline-pulse/formkrafter-react-native": minor
---

Runtime context, and formSubmit now implies valid

`fk-form-render` and `fk-form-builder` take a `context` prop: host-supplied
runtime values — an API host, a tenant plan, a token — that rules and
`optionsUrl` / `optionsHeaders` interpolation read alongside the form data,
`context` winning on a name clash. Nothing in it is validated, written by a
value effect, or emitted in `formDataChange` / `formSubmit`. `FormRenderer` in
`formkrafter-react-native` takes the same prop.

The `_`-prefix convention still works and stays supported.

`formSubmit` no longer fires when the form is invalid. It previously emitted
unconditionally after its validation pass, carrying `isValid: false`, which
forced hosts to re-validate defensively. Anything relying on being notified of
a rejected submission should listen to `formDataChange`, which still reports
every verdict.
