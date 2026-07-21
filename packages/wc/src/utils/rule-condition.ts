import type { Rule } from '@streamline-pulse/formkrafter-core';

export const OPERATORS = [
  { id: 'equals', label: 'equals' },
  { id: 'notEquals', label: 'does not equal' },
  { id: 'greaterThan', label: 'is greater than' },
  { id: 'lessThan', label: 'is less than' },
  { id: 'isEmpty', label: 'is empty' },
  { id: 'isNotEmpty', label: 'is not empty' },
] as const;

export type OperatorId = (typeof OPERATORS)[number]['id'];

export interface SimpleCondition {
  field: string;
  operator: OperatorId;
  value?: unknown;
}

export function buildLogic(condition: SimpleCondition): Rule['logic'] {
  const variable = { var: condition.field };

  switch (condition.operator) {
    case 'equals':
      return { '==': [variable, condition.value] } as Rule['logic'];
    case 'notEquals':
      return { '!=': [variable, condition.value] } as Rule['logic'];
    case 'greaterThan':
      return { '>': [variable, condition.value] } as Rule['logic'];
    case 'lessThan':
      return { '<': [variable, condition.value] } as Rule['logic'];
    case 'isEmpty':
      return { '!': variable } as Rule['logic'];
    case 'isNotEmpty':
      return { '!!': variable } as Rule['logic'];
  }
}

const varName = (value: unknown): string | undefined =>
  value !== null &&
  typeof value === 'object' &&
  typeof (value as { var?: unknown }).var === 'string'
    ? (value as { var: string }).var
    : undefined;

const BINARY_OPERATORS: Record<string, OperatorId> = {
  '==': 'equals',
  '!=': 'notEquals',
  '>': 'greaterThan',
  '<': 'lessThan',
};

export function parseLogic(logic: unknown): SimpleCondition | undefined {
  if (!logic || typeof logic !== 'object') return undefined;

  const entries = Object.entries(logic as Record<string, unknown>);
  if (entries.length !== 1) return undefined;

  const [operator, args] = entries[0];

  if (operator === '!' || operator === '!!') {
    const field = varName(Array.isArray(args) ? args[0] : args);
    if (!field) return undefined;

    return { field, operator: operator === '!' ? 'isEmpty' : 'isNotEmpty' };
  }

  const mapped = BINARY_OPERATORS[operator];
  if (!mapped || !Array.isArray(args) || args.length !== 2) return undefined;

  const field = varName(args[0]);
  if (!field) return undefined;

  return { field, operator: mapped, value: args[1] };
}

export function parseValueInput(raw: string): unknown {
  if (raw === '') return '';

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export function formatValue(value: unknown): string {
  if (value === undefined) return '';

  return typeof value === 'string' ? value : JSON.stringify(value);
}
