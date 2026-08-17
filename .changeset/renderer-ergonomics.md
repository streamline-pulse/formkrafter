---
"@streamline-pulse/formkrafter-core": minor
"@streamline-pulse/formkrafter-wc": minor
"@streamline-pulse/formkrafter-react": minor
"@streamline-pulse/formkrafter-vue": minor
"@streamline-pulse/formkrafter-react-native": minor
---

Build a form screen without touching a ref

`fk-form-render` gains a `validityChange` event, emitted on first render and on
every change with the full verdict. Binding a host button's `disabled` to it
needs no ref and no `validate()` call — the standard screen loses its imperative
plumbing.

Also: `submit()` as a public method (validates, emits `formSubmit` only when
valid, returns the verdict either way), `readOnly` to render every control
disabled and hide the built-in action, and `showSubmit` / `submitLabel` for
screens that want no external button at all.

`fk-form-render` is also a form-associated custom element: it participates in a
surrounding `<form>`, so an external `<button type="submit" form="…">` drives it
through the platform, `checkValidity()` reflects the form's state, and the
submitted value is exposed through `setFormValue`. Where `ElementInternals` is
missing the element behaves exactly as before.

Required fields are finally marked: an asterisk next to the label, a
screen-reader-only "(required)", and `aria-required` on the control. Nothing
distinguished them before, visually or for assistive technology.
