---
"@streamline-pulse/formkrafter-core": minor
"@streamline-pulse/formkrafter-wc": minor
"@streamline-pulse/formkrafter-react": minor
"@streamline-pulse/formkrafter-vue": minor
"@streamline-pulse/formkrafter-react-native": minor
---

Address every brick by path

`updateBrickConfigs`, `updateBrickStyles`, `updateBrickValidations` and
`updateBrickRules` took a `uid` while `addBrick`, `removeBrick`, `moveBrick` and
`duplicateBrick` took a path. They now all take a path, so there is one way to
point at a brick instead of two.

`pointerOfUid` is gone — with nothing addressed by uid, it had no callers. Use
`getBrickAt(spec, path)` to reach a brick and `pointerFromPath(path)` for its
JSON Pointer.

`fk-form-render`'s `selectedUid` prop is now `selectedPath`, and the
`brickConfigsChange`, `brickStylesChange`, `brickValidationsChange` and
`brickRulesChange` events carry `path` instead of `uid`.

A path that does not resolve to a brick now throws instead of silently
resolving to the root. `getBrickAt` previously returned the root for any string
without a dot separator, which made a malformed path edit the wrong node.
