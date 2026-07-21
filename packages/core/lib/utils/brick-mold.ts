import type { BrickSpec } from './brick-spec';
import type { BrickType } from './brick-type';

export interface BrickMold {
  type: BrickType;
  id: string;
  name: string;
  configsForm?: BrickSpec;
  category?: string;
  isPrivate?: boolean
}
