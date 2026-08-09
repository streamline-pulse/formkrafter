---
'@streamline-pulse/formkrafter-wc': patch
---

Harden tab buttons against host-page button styling. The components are
scoped rather than shadow-DOM, so a global `button { border-radius: … }`
rule in the host application leaked into the property-panel tabs and the
tabs layout brick. Both now declare their radius explicitly.
