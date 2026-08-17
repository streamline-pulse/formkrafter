import type { ReactNode } from 'react'
import type { BrickSpec } from '@streamline-pulse/formkrafter-core'
import type { FormEngine } from '../engine/form-engine.js'
import { useFkTheme } from '../theme.js'
import { renderBrick } from './render-brick.js'

interface BrickRendererProps {
  spec: BrickSpec
  data: Record<string, unknown>
  context?: Record<string, unknown>
  errors: Record<string, string>
  locale?: string
  engine: FormEngine
}

/** The recursive walker, ported from fk-brick-render minus the builder paths. */
export function BrickRenderer(props: BrickRendererProps): ReactNode {
  const theme = useFkTheme()
  const { spec, data, context, errors, locale, engine } = props
  if (!spec) return null

  const children = (spec.children ?? []).map((child, index) => (
    <BrickRenderer
      key={child.configs?.uid ?? `${spec.configs?.uid ?? 'brick'}-${index}`}
      spec={child}
      data={data}
      context={context}
      errors={errors}
      locale={locale}
      engine={engine}
    />
  ))

  return renderBrick({
    spec,
    scope: data,
    context,
    errors,
    locale,
    engine,
    children,
    onValue: (patch) => engine.setValues(patch),
    missingColor: theme.colorDanger,
  })
}
