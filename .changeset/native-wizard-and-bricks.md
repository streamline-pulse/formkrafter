---
'@streamline-pulse/formkrafter-react-native': minor
---

The native renderer now covers real production forms: a stepper wizard
with per-step validation, step navigation gating and submit (ported from
fk-stepper), radio and multi-select bricks, and date/time/datetime bricks
on a dedicated `formkrafter-react-native/date` entry point backed by
`@react-native-community/datetimepicker` as an optional peer — apps opt
in with `registerNativeDateBricks()`, everyone else never resolves the
native module.
