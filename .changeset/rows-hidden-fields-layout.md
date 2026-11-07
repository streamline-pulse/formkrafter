---
"@streamline-pulse/formkrafter-core": minor
"@streamline-pulse/formkrafter-wc": minor
"@streamline-pulse/formkrafter-react": minor
"@streamline-pulse/formkrafter-vue": minor
"@streamline-pulse/formkrafter-react-native": minor
---

Rows lay out the fields that are shown. A field hidden by a rule used to keep its column (its empty `<fk-brick-render>` host stayed in the row) and a gap in its group; the host is now hidden, so the fields still shown share the row and hidden bricks add no space. A row, column or group whose bricks are all hidden is hidden too, legend included. A row is a grid: it wraps when a column would be narrower than `--fk-row-min` (12rem) and shows one field per line under 36rem, and a group no longer pushes the page sideways on a phone. Labels, controls, hints and errors share tracks across a row and a data-grid row, so a two-line label or a hint under one field no longer shifts the controls, and a checkbox sits on the line of its neighbours' controls. Data-grid cells keep regular columns.

Checkboxes, radio buttons and select boxes show their `configs.description` and the required mark, like the other fields. A select shows its chosen value on two lines at most, with the whole label as a tooltip. The required mark, the submit button and the MRZ and range parts read the theme tokens (`--fk-color-danger`, `--fk-color-primary`, the new `--fk-color-on-primary`, …), so they follow dark mode.

New `layout` on a brick spec: `layout.columns` on a row gives it that many equal columns (a lone field keeps its share), `layout.span` on a child sets how many it takes. `lintSpec` reports a content brick placed in a row (`content-in-row`); the Python port reports it too.
