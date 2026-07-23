---
"@streamline-pulse/formkrafter-wc": patch
---

`fk-form-render` now registers the default bricks itself when the registry is empty. Previously a page using only the renderer (without `fk-form-builder`) displayed "Brick … not found" until something else registered the bricks.
