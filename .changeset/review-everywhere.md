---
"@streamline-pulse/formkrafter-core": minor
"@streamline-pulse/formkrafter-wc": minor
"@streamline-pulse/formkrafter-react": minor
"@streamline-pulse/formkrafter-vue": minor
"@streamline-pulse/formkrafter-react-native": minor
---

**Review reaches grid cells and the native renderer.** A data grid was
reviewed as one field on the web; now every cell can be flagged and commented
(`contacts[0].email`, the validation-error scheme) and `editableKeys` can
unlock single cells, locking the row actions. The native package gets
`FormReview` plus `annotations`, `notes` and `editableKeys` on `FormRenderer`,
with the notes and controls drawn by the shared `Field`; a read-only native
stepper no longer gates on validation nor shows its submit button. Also,
`formkrafter-core`'s declaration files now use explicit `.js` extensions, so
its types resolve under TypeScript's `NodeNext` instead of collapsing to `any`.
