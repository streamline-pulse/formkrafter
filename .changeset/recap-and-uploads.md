---
"@streamline-pulse/formkrafter-core": minor
"@streamline-pulse/formkrafter-wc": minor
"@streamline-pulse/formkrafter-react": minor
"@streamline-pulse/formkrafter-vue": minor
---

Recap brick, URL uploads and Form.io converter hardening.

- New `recap` brick (output): live summary of every filled entry of the form — labels resolved per locale, option values shown as their labels, collections listed row by row, rule-hidden and `_`-private fields excluded. Powered by a new `rootSpec` prop available to all bricks.
- New `UrlFileUploadService` in the core: multipart upload to a configurable URL (global default or per-brick `uploadUrl` config) with `remove()` support; the file brick now calls `remove` when a file is cleared and shows upload/delete errors.
- Form.io converter: `dataSrc: "json"` select options, `validate.custom` auto-converted to a sandboxed custom validator, javascript `logic` triggers converted to rules, `filePattern`/`multiple`/storage URL mapping, empty validation bounds ignored, and conditional visibility now wins over the `hidden` flag.
- radio and select-boxes bricks accept object-shaped options (`[{ label, value }]`) and store values while displaying labels.
