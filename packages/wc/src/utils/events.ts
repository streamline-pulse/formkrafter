import type {
  BrickBaseConfigs,
  BrickMold,
  BrickSpec,
  BrickStyles,
  Operation,
  Rule,
  Validation,
} from '@streamline-pulse/formkrafter-core';

export interface BrickDropDetail {
  source: 'new' | 'move';
  mold?: BrickMold;
  from?: string;
  parentPath: string;
  index?: number;
}

export interface BrickConfigsChangeDetail {
  configs: BrickBaseConfigs & Record<string, unknown>;
  uid?: string;
}

export interface BrickStylesChangeDetail {
  styles: BrickStyles<string>;
  uid?: string;
}

export interface BrickValidationsChangeDetail {
  validations: Validation[];
  uid?: string;
}

export interface BrickRulesChangeDetail {
  rules: Rule[];
  uid?: string;
}

export interface BrickPathDetail {
  path: string;
}

export interface SpecChangeDetail {
  spec?: BrickSpec;
  patches: Operation[];
  inverse: Operation[];
}

export interface DataChangeDetail {
  data: Record<string, unknown>;
  isValid: boolean;
  errors: Record<string, string>;
}
