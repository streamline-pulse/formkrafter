---
'@streamline-pulse/formkrafter-wc': patch
---

Accessibility fixes surfaced by an axe audit: the builder's locale select
now carries an accessible name (new `builder.editLocale` translation), the
custom select combobox exposes the brick label through a new
`accessibleLabel` prop on `fk-select-input`, and the default light-theme
primary darkens from #328f97 to #2b7a81 so white-on-primary text meets the
WCAG AA 4.5:1 contrast ratio.
