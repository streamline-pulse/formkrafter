---
"@streamline-pulse/formkrafter-core": minor
"@streamline-pulse/formkrafter-wc": minor
"@streamline-pulse/formkrafter-react": minor
"@streamline-pulse/formkrafter-vue": minor
"@streamline-pulse/formkrafter-react-native": minor
---

Remote option envelopes, runtime context, and formSubmit now implies valid

`dataSourceService.fetchOptions` accepted a bare JSON array and threw on
anything else, so every paginated API — `{ data: [...], page, total }` — failed
with *"Data source did not return an array"* despite a correct 200. A payload
whose `data` property is an array is now unwrapped automatically, and
`optionsPath` addresses any other envelope with a dotted path. A payload
matching neither still throws loudly: the point was never to coerce silently.

`fk-form-render` and `fk-form-builder` take a `context` prop: host-supplied
runtime values — an API host, a tenant plan, a token — that rules and
`optionsUrl` / `optionsHeaders` interpolation read alongside the form data,
`context` winning on a name clash. Nothing in it is validated, written by a
value effect, or emitted in `formDataChange` / `formSubmit`. `FormRenderer` in
`formkrafter-react-native` takes the same prop.

The `_`-prefix convention still works and stays supported.

Interpolation tokens accept dotted paths, so nested context needs no
flattening: `{api.base}/employees?dept={department}`. A key containing a dot is
matched before the path is walked, inherited properties stay unreachable, and a
token resolving to nothing is still an empty string — existing flat templates
are unchanged.

`formSubmit` no longer fires when the form is invalid. It previously emitted
unconditionally after its validation pass, carrying `isValid: false`, which
forced hosts to re-validate defensively. Anything relying on being notified of
a rejected submission should listen to `formDataChange`, which still reports
every verdict.
