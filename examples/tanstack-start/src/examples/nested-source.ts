import { services } from '@streamline-pulse/formkrafter-core'
import { addressSubSpec, emergencyContactSubSpec } from './specs'

import type { BrickSpec } from '@streamline-pulse/formkrafter-core'

const registry: Record<string, BrickSpec> = {
  adresse: addressSubSpec,
  'contact-urgence': emergencyContactSubSpec,
}

export function registerDemoSpecSource() {
  services.specSourceService = {
    fetchSpec: async (ref) => {
      await new Promise((resolve) => setTimeout(resolve, 150))
      const spec = ref in registry ? registry[ref] : undefined
      if (!spec) throw new Error(`Unknown form reference "${ref}"`)
      return structuredClone(spec)
    },
  }
}
