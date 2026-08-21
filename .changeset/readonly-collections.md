---
"@streamline-pulse/formkrafter-wc": patch
"@streamline-pulse/formkrafter-react": patch
"@streamline-pulse/formkrafter-vue": patch
---

Propagate readOnly into collection rows

`readOnly` reached every brick except those inside a `collection`: the grid
locked its own chrome because it receives `disabled`, but the `fk-brick-render`
it instantiates per row got no `readOnly` at all and fell back to `false`. A
form declared read-only accepted typing in any grid cell, at any nesting depth,
including a collection inside a collection.

`fk-data-grid` takes a `readOnly` prop and passes it to every row. The stray
row-level delete button that stayed active came from the same gap and is covered
by the same fix.

The React Native grid already forwarded `disabled` to its rows and was never
affected.
