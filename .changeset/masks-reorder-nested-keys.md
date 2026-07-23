---
"@streamline-pulse/formkrafter-core": minor
"@streamline-pulse/formkrafter-wc": minor
"@streamline-pulse/formkrafter-react": minor
"@streamline-pulse/formkrafter-vue": minor
---

Input masks, data-grid row reordering, nested option keys and a dark code editor.

- Text and phone bricks support a `mask` config (`9` digit, `a` letter, `A` uppercase letter, `*` alphanumeric — literals auto-inserted), editable in the property panel. The Form.io converter maps `inputMask` to it.
- Data-grid rows can be reordered with accessible up/down buttons; per-row touched state follows the move.
- `labelKey` / `valueKey` accept dotted paths (`name.common`) for object-shaped options, in every options source.
- The code editor switches to the One Dark theme when rendered inside a dark context (`.dark` or `data-fk-theme="dark"`).
