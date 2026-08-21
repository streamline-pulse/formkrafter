import { Text } from 'react-native'
import type { ReactNode } from 'react'
import {
  getAffectedProperties,
  getBrickData,
  resolveLocalizedRecord,
  wrapBrickData,
} from '@streamline-pulse/formkrafter-core'
import type { BrickSpec } from '@streamline-pulse/formkrafter-core'
import { getNativeBrick } from '../registry.js'
import type { FormEngine } from '../engine/form-engine.js'

export interface RenderBrickOptions {
  spec: BrickSpec
  scope: Record<string, unknown>
  context?: Record<string, unknown>
  errors: Record<string, string>
  locale?: string
  engine: FormEngine
  disabled?: boolean
  children?: ReactNode
  onValue: (patch: Record<string, unknown>) => void
  missingColor: string
}

export function renderBrick(options: RenderBrickOptions): ReactNode {
  const { spec, scope, context, errors, locale, engine } = options
  const dataMap = context ? { ...scope, ...context } : scope

  const brick = getNativeBrick(spec.type, spec.id)
  if (!brick) {
    return (
      <Text style={{ color: options.missingColor }}>
        {`Brick ${spec.type}:${spec.id} has no native renderer`}
      </Text>
    )
  }

  const affected = getAffectedProperties(spec.rules, dataMap)
  if (affected.hidden === true) return null

  const key = spec.configs?.key

  return brick.render({
    spec,
    configs: resolveLocalizedRecord(spec.configs, locale) ?? {},
    locale,
    data: getBrickData(spec, scope),
    dataMap,
    validations: spec.validations,
    error: key ? errors[key] : undefined,
    disabled: options.disabled === true || affected.disabled === true,
    engine,
    children: options.children,
    onDataChange: (value) => {
      const wrapped = wrapBrickData(spec, value)
      if (wrapped !== undefined) options.onValue(wrapped)
    },
  })
}
