---
'@streamline-pulse/formkrafter-wc': patch
---

Default bricks no longer clobber application overrides. Registering your
own version of a built-in brick — a UI-kit skin, for example — before the
first component mounts now survives the default registration, regardless
of order.
