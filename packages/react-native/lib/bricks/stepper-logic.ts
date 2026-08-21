import {
  iterateSchemaBricks,
  validateBrickSpecDataDetailed,
} from '@streamline-pulse/formkrafter-core'
import type { BrickSpec } from '@streamline-pulse/formkrafter-core'

export function stepKeys(step: BrickSpec): string[] {
  const keys: string[] = []
  for (const brick of iterateSchemaBricks(step)) {
    if (brick.configs?.key) keys.push(brick.configs.key)
  }
  return keys
}

const wrap = (step: BrickSpec, index: number): BrickSpec =>
  ({
    type: 'panel',
    id: 'step',
    name: 'Step',
    configs: { key: `step_${index}` },
    children: [step],
  }) as BrickSpec

export function stepValid(
  step: BrickSpec,
  index: number,
  dataMap: Record<string, unknown> | undefined,
  locale?: string,
): boolean {
  const present = Object.fromEntries(
    Object.entries(dataMap ?? {}).filter(
      ([, value]) => value !== '' && value !== null && value !== undefined,
    ),
  )

  return validateBrickSpecDataDetailed(wrap(step, index), present, locale).valid
}
