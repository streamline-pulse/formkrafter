---
"@streamline-pulse/formkrafter-core": minor
"@streamline-pulse/formkrafter-wc": minor
"@streamline-pulse/formkrafter-react-native": minor
---

Documents: a `document` brick reads a scanned or uploaded document through the host's `services.documentReaderService` (default `FetchDocumentReaderService` posting the file to `readUrl`), shows the text and the requested fields (`fields`, editable), and can fill other form keys (`fills`). Bricks can now patch several form keys at once through `onDataPatch`.
