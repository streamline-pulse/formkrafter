---
'@streamline-pulse/formkrafter-react-native': patch
---

Rules now apply to bricks inside a data grid row: the grid rendered its
rows through its own mini-walker, which looked bricks up in the registry
but never resolved their rules — a field hidden or disabled by a rule
showed up anyway, unlike the web grid. Row rendering now goes through
the same renderBrick path as the form walker, so the two cannot drift.
