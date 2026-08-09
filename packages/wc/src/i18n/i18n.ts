// The implementation moved to core so DOM-free renderers (react-native) can
// share the chrome translations; this re-export keeps every wc import and
// the package's public API unchanged. The store lives behind Symbol.for, so
// the state is a true singleton even when core is bundled twice.
export {
  setFkTranslations,
  fkT,
  fkTOr,
  frFkTranslations,
} from '@streamline-pulse/formkrafter-core';
export type { FkTranslations } from '@streamline-pulse/formkrafter-core';
