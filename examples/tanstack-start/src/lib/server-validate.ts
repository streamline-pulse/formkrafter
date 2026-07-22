import { createServerFn } from '@tanstack/react-start'
import { validateFormData } from '@streamline-pulse/formkrafter-core'
import type { BrickSpec, ValidationResult } from '@streamline-pulse/formkrafter-core'

export interface ServerValidatePayload {
  spec: BrickSpec
  values: Record<string, unknown>
  locale?: string
}

export const validateOnServer = createServerFn({ method: 'POST' })
  .validator((payload: ServerValidatePayload) => payload)
  .handler(async ({ data }): Promise<ValidationResult> => {
    return validateFormData(data.spec, data.values, data.locale)
  })
