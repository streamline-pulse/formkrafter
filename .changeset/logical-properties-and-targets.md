---
"@streamline-pulse/formkrafter-wc": patch
---

Support right-to-left layouts, and meet the minimum target size

Component stylesheets now use logical properties throughout — `margin-inline`,
`inset-inline`, `border-inline-end`, `text-align: start|end` — so setting
`dir="rtl"` mirrors the layout with no per-locale CSS. Covered by a test that
compares LTR and RTL offsets from the start edge, which is what actually catches
a physical property.

Grid row controls, stepper navigation, tabs and step labels rendered at 22px
high, under the 24px WCAG 2.2 minimum target size. Fixed with a floor rather
than padding, so a theme that shrinks `--fk-spacing` cannot reintroduce it.
