---
'@streamline-pulse/formkrafter-wc': minor
---

`fk-form-builder` gains a `locale` prop for its own chrome language:
paired with `setFkTranslations`, the toolbar, palette and property panel
re-render on a language switch without remounting the builder — which
used to be the only way, wiping the form being built. Distinct from
`editLocale`, the content language being edited.
