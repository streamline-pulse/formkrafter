import { Text } from 'react-native'
import type { ReactNode } from 'react'
import {
  getAffectedProperties,
  getBrickData,
  resolveLocalizedRecord,
  wrapBrickData,
} from '@streamline-pulse/formkrafter-core'
import type { BrickSpec } from '@streamline-pulse/formkrafter-core'
import { getNativeBrick } from '../registry'
import type { FormEngine } from '../engine/form-engine'
import { useFkTheme } from '../theme'

interface BrickRendererProps {
  spec: BrickSpec
  data: Record<string, unknown>
  errors: Record<string, string>
  locale?: string
  engine: FormEngine
}

/** The recursive walker, ported from fk-brick-render minus the builder paths. */
export function BrickRenderer(props: BrickRendererProps): ReactNode {
  const theme = useFkTheme()
  const { spec, data, errors, locale, engine } = props

  const brick = getNativeBrick(spec.type, spec.id)
  if (!brick) {
    return (
      <Text style={{ color: theme.colorDanger }}>
        {`Brick ${spec.type}:${spec.id} has no native renderer`}
      </Text>
    )
  }

  const affected = getAffectedProperties(spec.rules, data)
  if (affected.hidden === true) return null

  const children = (spec.children ?? []).map((child, index) => (
    <BrickRenderer
      key={child.configs?.uid ?? `${spec.configs?.uid ?? 'brick'}-${index}`}
      spec={child}
      data={data}
      errors={errors}
      locale={locale}
      engine={engine}
    />
  ))

  return brick.render({
    spec,
    configs: resolveLocalizedRecord(spec.configs, locale) ?? {},
    locale,
    data: getBrickData(spec, data),
    dataMap: data,
    error: spec.configs?.key ? errors[spec.configs.key] : undefined,
    disabled: affected.disabled === true,
    engine,
    children,
    onDataChange: (value) => {
      const wrapped = wrapBrickData(spec, value)
      if (wrapped !== undefined) engine.setValues(wrapped)
    },
  })
}
