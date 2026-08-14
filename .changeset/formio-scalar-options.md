---
'@streamline-pulse/formkrafter-core': patch
---

`convertFormioForm` no longer crashes on option lists of scalars.
Form.io commonly emits `data.json: ["A0", "A1", "LETTER"]`, and the
converter assumed every item was an object — `"value" in items[0]` threw
`TypeError: ... is not an Object`. Scalar items now become
`{ label: String(item), value: String(item) }`, objects keep their
`valueProperty` / template mapping, and mixed or empty lists are handled.
The same hardening covers `values` lists, where scalars used to convert
silently into empty options.
