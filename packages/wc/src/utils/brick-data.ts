// Moved to core so DOM-free renderers can share the data plumbing; this
// re-export keeps every wc import unchanged.
export { getBrickData, wrapBrickData } from '@streamline-pulse/formkrafter-core';
