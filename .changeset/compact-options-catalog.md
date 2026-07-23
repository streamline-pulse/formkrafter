---
"@streamline-pulse/formkrafter-core": minor
"@streamline-pulse/formkrafter-wc": minor
---

Slimmer specs for option-heavy forms:

- `convertFormioForm` now emits static options as a compact newline string whenever every option's label equals its value (the common case in Form.io exports) — real production specs shrink up to 4× vs the Form.io definition. Lists where labels differ keep the `{ label, value }` object form.
- The converter warns when a component embeds more than 100 static options, recommending a remote source or a shared catalog.
- New `catalog` options source for select/multi-select: set `optionsRef` and the options are resolved through the new `services.optionSourceService` (default `FetchOptionSourceService`: treats the ref as a URL, supports `baseUrl`, headers, credentials and per-URL caching). Store a big list once, reference it from any number of forms.
