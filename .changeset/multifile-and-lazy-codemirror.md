---
"@streamline-pulse/formkrafter-core": minor
"@streamline-pulse/formkrafter-wc": minor
"@streamline-pulse/formkrafter-react": minor
"@streamline-pulse/formkrafter-vue": minor
---

Multi-file uploads and a much lighter render bundle.

- The file brick now supports `multiple: true` in its configs: the value becomes an `UploadedFile[]`, each file has its own remove button (calling the upload service's `remove`), and an "+ Add a file" button appends more. The Form.io converter maps `multiple` file components to it (dataType `array`).
- CodeMirror is now loaded lazily by `fk-code-editor`: it only downloads when a code editor is actually shown (Rules/JS panels in the builder). Render-only consumers no longer pay for it — the FormKrafter chunk of a typical app drops from ~1 MB to ~424 KB minified (~125 KB gzip).
