---
"@streamline-pulse/formkrafter-wc": patch
---

Fix the built-in bricks disappearing when an app registers a custom brick.

`<fk-form-render>` and `<fk-form-builder>` only registered the 30 built-in
bricks when the registry was empty. Registering a custom brick at startup —
the flow the docs recommend — left the registry non-empty, so the built-ins
never registered and every spec rendered `Brick panel:column not found`, with
only the custom brick left in the palette.

The components now always call `registerDefaultBricks()`, which is idempotent:
it tracks whether the defaults are already in place through a `globalThis`
flag, mirroring how the registry itself is shared across bundle copies.
