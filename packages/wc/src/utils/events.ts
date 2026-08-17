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
  path?: string;
}

export interface BrickStylesChangeDetail {
  styles: BrickStyles<string>;
  path?: string;
}

export interface BrickValidationsChangeDetail {
  validations: Validation[];
  path?: string;
}

export interface BrickRulesChangeDetail {
  rules: Rule[];
  path?: string;
}

export interface BrickPathDetail {
  path: string;
}

export interface SpecChangeDetail {
  spec?: BrickSpec;
  patches: Operation[];
  inverse: Operation[];
}

export interface ValidityChangeDetail {
  valid: boolean;
  errors: Record<string, string>;
}

export interface DataChangeDetail {
  data: Record<string, unknown>;
  isValid: boolean;
  errors: Record<string, string>;
}
