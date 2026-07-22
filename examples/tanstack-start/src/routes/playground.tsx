import { Suspense, lazy, useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { m } from '#/paraglide/messages'
import { templates } from '#/examples/catalog'

const FormKrafterPlayground = lazy(
  () => import('#/components/FormKrafterPlayground')
)

export const Route = createFileRoute('/playground')({
  validateSearch: (search: Record<string, unknown>): { template?: string } =>
    typeof search.template === 'string' ? { template: search.template } : {},
  component: Playground,
})

function Playground() {
  const { template } = Route.useSearch()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const initialSpec = template ? templates[template] : undefined

  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-xs font-bold tracking-widest text-primary uppercase">
        {m.playground_kicker()}
      </p>
      <h1 className="mt-1 text-3xl font-bold">{m.playground_title()}</h1>
      <p className="text-muted-foreground mt-3 mb-6 text-[15px]">
        {m.playground_intro()}
      </p>

      {mounted ? (
        <Suspense fallback={<p className="text-muted-foreground">{m.loading()}</p>}>
          <FormKrafterPlayground key={template ?? 'blank'} initialSpec={initialSpec} />
        </Suspense>
      ) : (
        <p className="text-muted-foreground">{m.loading()}</p>
      )}
    </div>
  )
}
