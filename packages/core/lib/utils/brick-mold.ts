import type { BrickSpec } from './brick-spec.js';
import type { BrickType } from './brick-type.js';

export interface BrickMold {
  type: BrickType;
  id: string;
  name: string;
  configsForm?: BrickSpec;
  category?: string;
  isPrivate?: boolean
}
