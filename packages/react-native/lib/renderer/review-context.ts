import { createContext } from 'react'
import type { FieldAnnotation } from '@streamline-pulse/formkrafter-core'

export interface FieldReviewValue {
  annotation?: FieldAnnotation
  note?: FieldAnnotation
  review?: { value: FieldAnnotation; onChange: (next: FieldAnnotation) => void }
}

/** What the surrounding renderer knows about the field being drawn; read by `Field`. */
export const FieldReviewContext = createContext<FieldReviewValue>({})
