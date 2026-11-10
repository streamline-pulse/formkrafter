---
"@streamline-pulse/formkrafter-wc": minor
---

Design polish of the form controls and the builder. **Visible change to existing forms**: fields are further apart, and every one-line control has the same height.

- **Select.** The arrow was a 6px « ▾ » character 9px from the right border; it is now a 16px chevron with the inline padding of a text input, and it turns over when the list is open. The trigger measured 48px instead of 38px on a page without a global `box-sizing: border-box`; it now has the height, font size and padding of the other fields. The « × » that empties it is a 24px target beside the chevron, and the list's options and search box line up with the trigger's text.
- **Native selects** (zone of a map layer, currency, unit of a measure, the builder's language) draw the same chevron, away from the border, instead of the browser's arrow pressed against it.
- **One height for every one-line control**: `--fk-control-height` (2.375rem). Text, date, time, date-time inputs, selects and the tags field came out between 35px and 48px.
- **Spacing**: fields of a column, a group or a wrapping row are `--fk-field-gap` apart (16px, was 8px), and the fields of a row 12px apart.
- **Dark theme**: `.dark` and `[data-fk-theme='dark']` set `color-scheme: dark`, so date and time pickers show their icons, and radios and checkboxes are no longer white discs on a dark surface; `[data-fk-theme='light']` sets `color-scheme: light`.
- **Radios and checkboxes**: 16px boxes with no browser margin, 8px from their label; a single checkbox and a list of options line up.
- **Tags** have the height and padding of a text input, and its focus ring.
- **Address search** takes the full width of its field; the address brick's two-column grid applied to it.
- **Builder**: palette names wrap on two lines instead of « Address sea… »; the toolbar and the category chevrons use line icons instead of mixed characters (↩ ⤓ ⧉ ⬇ ▾), and the toolbar's buttons no longer break inside a label when it is narrow; a selected brick's actions sit astride its border instead of over its control.
- **Table lines** (a row with `layout.labels: "hidden"`, data-grid cells): the controls of a line share one middle, so a select whose value takes two lines no longer leaves the inputs beside it 4px high.

`styles.css` is 3 KB gzipped (was 2.7 KB).
