// Moved to core so DOM-free renderers share the exact same remote-options
// plumbing; this re-export keeps every wc import unchanged.
export {
  interpolateTemplate,
  parseHeaderLines,
  appendSearchParam,
} from '@streamline-pulse/formkrafter-core';
