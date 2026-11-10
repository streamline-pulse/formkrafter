import { h } from '@stencil/core';

/*
 * Line icons drawn in currentColor, sized by their container (1em by default).
 * Text glyphs (▾, ⬇, ⧉…) took the size and the metrics of the font: a select's
 * arrow came out 6px wide, and the builder's tools did not match each other.
 */
const PATHS = {
  chevronDown: 'M4 6l4 4 4-4',
  undo: 'M6 4L3 7l3 3M3 7h6.5a3.5 3.5 0 010 7H7',
  redo: 'M10 4l3 3-3 3M13 7H6.5a3.5 3.5 0 000 7H9',
  import: 'M8 2v8M5 7l3 3 3-3M3 12v1.5h10V12',
  copy: 'M5.5 5.5h7v8h-7zM3.5 10.5V2.5h7',
  download: 'M8 2v8M5 7l3 3 3-3M3 13.5h10',
} as const;

export type FkIconName = keyof typeof PATHS;

export const fkIcon = (name: FkIconName) => (
  <svg
    class="fk-icon"
    viewBox="0 0 16 16"
    width="1em"
    height="1em"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d={PATHS[name]} />
  </svg>
);
