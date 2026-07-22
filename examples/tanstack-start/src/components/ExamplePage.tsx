import { Suspense, useEffect, useState } from 'react'
import type { ComponentType, LazyExoticComponent } from 'react'

import { m } from '#/paraglide/messages'

interface ExamplePageProps {
  component: LazyExoticComponent<ComponentType>
  kicker: () => string
  title: () => string
  intro: () => string
}

export function ExamplePage({ component: Demo, kicker, title, intro }: ExamplePageProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-xs font-bold tracking-widest text-primary uppercase">
        {kicker()}
      </p>
      <h1 className="mt-1 text-3xl font-bold">{title()}</h1>
      <p className="text-muted-foreground mt-3 mb-6 text-[15px]">{intro()}</p>

      {mounted ? (
        <Suspense fallback={<p className="text-muted-foreground">{m.loading()}</p>}>
          <Demo />
        </Suspense>
      ) : (
        <p className="text-muted-foreground">{m.loading()}</p>
      )}
    </div>
  )
}
