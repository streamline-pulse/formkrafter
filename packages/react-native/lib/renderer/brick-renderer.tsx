import type { ReactNode } from 'react'
import type { BrickSpec, FieldAnnotation, FieldAnnotations } from '@streamline-pulse/formkrafter-core'
import type { FormEngine } from '../engine/form-engine.js'
import { useFkTheme } from '../theme.js'
import { renderBrick } from './render-brick.js'

interface BrickRendererProps {
  spec: BrickSpec
  data: Record<string, unknown>
  context?: Record<string, unknown>
  readOnly?: boolean
  errors: Record<string, string>
  locale?: string
  engine: FormEngine
  /** Reviewer notes shown under the matching fields (by brick key). */
  annotations?: FieldAnnotations
  /** An earlier review's verdicts, shown as reminders. */
  notes?: FieldAnnotations
  /** When set, only these keys stay editable. */
  editableKeys?: string[]
  /** Review mode: flag and comment controls under every field. */
  reviewable?: boolean
  onFieldReview?: (key: string, annotation: FieldAnnotation) => void
}

export function BrickRenderer(props: BrickRendererProps): ReactNode {
  const theme = useFkTheme()
  const { spec, data, context, readOnly, errors, locale, engine } = props
  if (!spec) return null

  const children = (spec.children ?? []).map((child, index) => (
    <BrickRenderer
      key={child.configs?.uid ?? `${spec.configs?.uid ?? 'brick'}-${index}`}
      spec={child}
      data={data}
      context={context}
      readOnly={readOnly}
      errors={errors}
      locale={locale}
      engine={engine}
      annotations={props.annotations}
      notes={props.notes}
      editableKeys={props.editableKeys}
      reviewable={props.reviewable}
      onFieldReview={props.onFieldReview}
    />
  ))

  // Only fields carry data, so only they are locked, annotated or reviewed.
  const key = spec.configs?.key
  const isField = !!key && (spec.type === 'input' || spec.type === 'collection')
  const locked = isField && props.editableKeys !== undefined && !props.editableKeys.includes(key)
  const annotation = isField ? props.annotations?.[key] : undefined
  const note = isField ? props.notes?.[key] : undefined
  const review =
    isField && props.reviewable
      ? {
          value: annotation ?? {},
          onChange: (next: FieldAnnotation) => props.onFieldReview?.(key, next),
        }
      : undefined

  return renderBrick({
    spec,
    scope: data,
    context,
    disabled: readOnly || locked,
    errors,
    locale,
    engine,
    children,
    onValue: (patch) => engine.setValues(patch),
    missingColor: theme.colorDanger,
    annotation,
    note,
    review,
  })
}
