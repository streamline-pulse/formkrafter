---
"@streamline-pulse/formkrafter-core": minor
"@streamline-pulse/formkrafter-wc": minor
"@streamline-pulse/formkrafter-react": minor
"@streamline-pulse/formkrafter-vue": minor
"@streamline-pulse/formkrafter-react-native": minor
---

Dense rows for tables. `layout.labels: "hidden"` on a row hides its fields' labels from view and keeps them as accessible names, so a row of checkbox, select and url is one control high; a checkbox keeps its label beside the box. `layout.columns` also takes one track size per column, e.g. `["auto", "1fr", "2fr", "auto"]` (`auto`, `min-content`, `max-content`, `fr`, `px`, `rem`, `em`, `ch`, `%`, `minmax(a, b)`), so a checkbox column takes only its content and a four-field row stays on one line in a 560px container instead of wrapping under the 12rem minimum. In such a row each field keeps its column: a field hidden by a rule leaves its cell empty, so the next fields stay aligned. The row still stacks one field per line under 36rem. The number form of `layout.columns` is unchanged. The JSON schema accepts both forms and `layout.labels`.

**Visible change to existing forms — select.** A select used to open a « Search… » box whatever its length, and always showed a « × » once a value was chosen. Two new configs control this, with defaults that change what existing forms show:

- `configs.searchable`: `"auto"` (the default) shows the search box only above 7 options, or when the server searches (`remote` with `searchParam`); `true` or `false` forces it. A short list now opens as a plain list driven from the field itself: arrows, Home/End, Enter or Space to pick, a letter to jump. Set `searchable: true` to keep the previous behaviour. React Native follows the same rule.
- `configs.clearable`: the « × » that empties a single select is now hidden when the field is required (it could only produce a « required » error); `clearable: true` brings it back, `clearable: false` hides it on an optional field. The trigger also carries `aria-required`.

The bundle size in the web components README was measured at v0.5.0 (~205 KB gzipped for the renderer). It now gives the eager cost measured on v0.34.0 by a new `bun run size:eager` script: about 145–155 KB gzipped before a form shows, whether a page imports only the renderer or every component, and about 355–370 KB counting the lazily loaded chunks (code editor, map). `styles.css` is 2.7 KB gzipped, not 1.6 KB.
