import type { BrickSpec } from './brick-spec';

export function getBrickData(
  brickSpec: BrickSpec,
  data?: Record<string, unknown>
): unknown {
  if (!brickSpec.configs?.key || !data) return undefined;

  if (brickSpec.unWrapData) return data;
  return data[brickSpec.configs.key];
}

export function wrapBrickData(
  brickSpec: BrickSpec,
  value: unknown
): Record<string, unknown> | undefined {
  if (!brickSpec.configs?.key) return undefined;

  if (brickSpec.unWrapData) return value as Record<string, unknown>;
  return { [brickSpec.configs.key]: value };
}
