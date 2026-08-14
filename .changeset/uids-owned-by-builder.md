---
'@streamline-pulse/formkrafter-core': minor
'@streamline-pulse/formkrafter-wc': minor
---

Brick `uid`s become a builder-session detail instead of part of the
stored spec. `fk-form-builder` hydrates missing uids whenever a spec
loads — until now it only did so for clipboard imports, so a spec passed
through the `spec` prop without uids could not be selected or edited at
all, silently — and strips them from the spec and patches it emits.
`convertFormioForm` no longer emits them either.

Nothing on the render path ever read `uid`: validation, rules, recap and
nested-form expansion are unaffected, and patches address bricks by JSON
path. New core helpers `ensureBrickUids`, `stripBrickUids` and
`stripUidsFromPatches` make the transform available to any host.
