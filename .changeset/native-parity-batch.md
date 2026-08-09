---
'@streamline-pulse/formkrafter-react-native': minor
---

Grid rows now count in the global validate() verdict — the engine
validates through core's validateFormData, which descends into
collection rows, and a validation epoch in the snapshot makes the grid
surface every row error after a global validation. The tabs layout
arrives with its validate-before-leaving gate. The file brick lands on a
new `formkrafter-react-native/file` entry point backed by
expo-document-picker as an optional peer, uploading through core's
fileUploadService with the same stored shape as the web. Validation is
also memoized per change instead of running twice per keystroke.
