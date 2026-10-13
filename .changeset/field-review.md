---
"@streamline-pulse/formkrafter-core": minor
"@streamline-pulse/formkrafter-wc": minor
"@streamline-pulse/formkrafter-react": minor
"@streamline-pulse/formkrafter-vue": minor
"@streamline-pulse/formkrafter-react-native": minor
---

**Field review: `<fk-form-review>`, `annotations` and `editableKeys`.** A
reviewer could only look at a filled form; saying *which* field was wrong, and
why, had to be rebuilt by every host. `<fk-form-review>` renders the data
read-only with an "Incorrect" flag and a comment box under every field and
emits `reviewChange` with the annotation map. `<fk-form-render>` takes the same
map as `annotations` to show the notes under the flagged fields, and
`editableKeys` to leave only those fields editable. `flaggedKeys()` in core
derives the second from the first. Web only for now: the native renderer
ignores both props. Also fixed: a `readOnly` form no longer shows the stepper's
submit button.
