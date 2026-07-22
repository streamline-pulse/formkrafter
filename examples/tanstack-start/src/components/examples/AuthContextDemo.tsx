import { useEffect, useState } from 'react'
import { services } from '@streamline-pulse/formkrafter-core'
import type { DataSourceService } from '@streamline-pulse/formkrafter-core'

import FormDemo from './FormDemo'
import { authSpec } from '#/examples/specs'
import { m } from '#/paraglide/messages'

export default function AuthContextDemo() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const original = services.dataSourceService

    const echoService: DataSourceService = {
      fetchOptions: async (url, options) => [
        { label: `URL → ${url}`, value: 'url' },
        ...Object.entries(options?.headers ?? {}).map(([name, value]) => ({
          label: `${name} → ${value}`,
          value: name,
        })),
      ],
    }
    services.dataSourceService = echoService
    setReady(true)

    return () => {
      services.dataSourceService = original
    }
  }, [])

  if (!ready) return null

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">{m.ex_auth_proof()}</p>
      <FormDemo
        spec={authSpec}
        data={{ _authToken: 'demo-secret-123', _tenant: 'kora' }}
      />
    </div>
  )
}
