# @streamline-pulse/formkrafter-react

React components for FormKrafter — generated at build time from the [Web Components](../wc/README.md), so props, events, and types always match the underlying library.

## Install & use

```tsx
import { useRef, useState } from 'react'
import type { ComponentRef } from 'react'
import { FkFormBuilder, FkFormRender } from '@streamline-pulse/formkrafter-react'
import '@streamline-pulse/formkrafter-wc/styles.css'

import type { BrickSpec, ValidationResult } from '@streamline-pulse/formkrafter-core'
import type { SpecChangeDetail, DataChangeDetail } from '@streamline-pulse/formkrafter-wc'

export function FormPlayground() {
  const [spec, setSpec] = useState<BrickSpec>()
  const renderRef = useRef<ComponentRef<typeof FkFormRender>>(null)

  return (
    <>
      <FkFormBuilder
        locales={['en', 'fr']}
        onSpecChange={(e: CustomEvent<SpecChangeDetail>) => setSpec(structuredClone(e.detail.spec))}
      />

      {spec && (
        <FkFormRender
          ref={renderRef}
          spec={spec}
          locale="fr"
          data={{ _authToken: session.token }}
          onFormSubmit={(e: CustomEvent<DataChangeDetail>) => post(e.detail.data)}
        />
      )}

      <button onClick={async () => {
        const result: ValidationResult = await renderRef.current!.validate()
        console.log(result.valid, result.errors)
      }}>
        Validate
      </button>
    </>
  )
}
```

Conventions: web-component events become `on<PascalCase>` props (`specChange` → `onSpecChange`, `formSubmit` → `onFormSubmit`); complex props (`spec`, `data`, `locales`) are passed as objects, no serialization needed; element methods (`validate()`) are reached through a `ref`.

## SSR (Next.js, TanStack Start, …)

The custom elements register themselves on import, which requires a DOM — mount FormKrafter components **client-side only**:

```tsx
const Playground = lazy(() => import('./FormPlayground'))

function Page() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted ? <Suspense fallback={<p>Loading…</p>}><Playground /></Suspense> : <p>Loading…</p>
}
```

Server-side, validate submissions with the isomorphic core instead:

```ts
import { validateFormData } from '@streamline-pulse/formkrafter-core'
```

See the full working app in [`examples/tanstack-start`](../../examples/tanstack-start) — builder, live preview, en/fr switching, dark mode, submit flow.
