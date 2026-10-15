import { useCallback, useEffect, useState } from 'react'
import { flaggedKeys } from '@streamline-pulse/formkrafter-core'
import type { BrickSpec, FieldAnnotation, FieldAnnotations } from '@streamline-pulse/formkrafter-core'
import { FormRenderer } from './form-renderer.js'

export interface FormReviewProps {
  spec: BrickSpec
  data?: Record<string, unknown>
  context?: Record<string, unknown>
  locale?: string
  /** Annotations to start from (a draft of this pass). */
  reviews?: FieldAnnotations
  /** The previous pass's verdicts, shown as reminders; the new review starts empty. */
  notes?: FieldAnnotations
  onReviewChange?: (reviews: FieldAnnotations, flagged: string[]) => void
}

/**
 * A filled form, read-only, where a reviewer flags fields as incorrect and
 * comments them. Rendering is delegated to FormRenderer; this component only
 * holds the review map and reports it.
 */
export function FormReview(props: FormReviewProps) {
  const [current, setCurrent] = useState<FieldAnnotations>(() => ({ ...(props.reviews ?? {}) }))

  useEffect(() => {
    setCurrent({ ...(props.reviews ?? {}) })
  }, [props.reviews])

  const onFieldReview = useCallback(
    (key: string, annotation: FieldAnnotation) => {
      setCurrent((previous) => {
        const next = { ...previous }
        if (annotation.incorrect !== true && !annotation.comment) delete next[key]
        else next[key] = annotation
        props.onReviewChange?.(next, flaggedKeys(next))
        return next
      })
    },
    [props.onReviewChange],
  )

  return (
    <FormRenderer
      spec={props.spec}
      data={props.data}
      context={props.context}
      locale={props.locale}
      readOnly
      reviewable
      annotations={current}
      notes={props.notes}
      onFieldReview={onFieldReview}
    />
  )
}
