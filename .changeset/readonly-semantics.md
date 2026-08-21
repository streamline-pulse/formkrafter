---
"@streamline-pulse/formkrafter-core": minor
"@streamline-pulse/formkrafter-wc": minor
"@streamline-pulse/formkrafter-react": minor
"@streamline-pulse/formkrafter-vue": minor
---

`readOnly` renders `readonly`, not `disabled`

A read-only form was rendered entirely with `disabled`, which is the wrong
statement: it says *unavailable*, greys the value out, drops it from the tab
order and — the blocking part — makes it impossible to select or copy. A review
panel exists precisely so someone can read and copy what was submitted.

`readOnly` now puts `readonly` on text inputs and textareas, with
`aria-readonly`. Controls HTML defines no `readonly` for — select, checkbox,
radio, file — keep `disabled` and gain `aria-readonly`. Collection actions stay
`disabled`: they are actions, not values. Submission is neutralised under
`readOnly`, which it was not before.

`disabled` is now a distinct prop meaning *unavailable*, rendering `disabled`
throughout, and is no longer a synonym for `readOnly`.
