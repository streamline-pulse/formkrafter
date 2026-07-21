import { useState } from 'react'
import { FkFormBuilder, FkFormRender } from '@streamline-pulse/formkrafter-react'
import '@streamline-pulse/formkrafter-wc/dist/formkrafter-wc/formkrafter-wc.css'

import { m } from '#/paraglide/messages'

import type { BrickSpec } from '@streamline-pulse/formkrafter-core'
import type { DataChangeDetail, SpecChangeDetail } from '@streamline-pulse/formkrafter-wc'

export default function FormKrafterPlayground() {
  const [spec, setSpec] = useState<BrickSpec | undefined>(undefined)
  const [result, setResult] = useState<DataChangeDetail | undefined>(undefined)

  function handleSpecChange(event: CustomEvent<SpecChangeDetail>) {
    setSpec(event.detail.spec ? structuredClone(event.detail.spec) : undefined)
  }

  return (
    <div className="space-y-8">
      <FkFormBuilder onSpecChange={handleSpecChange} />

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{m.playground_preview()}</h2>
        <div className="border-border bg-card rounded-lg border p-4">
          {spec ? (
            <FkFormRender
              spec={spec}
              onFormDataChange={(event) => setResult(event.detail)}
            />
          ) : (
            <p className="text-muted-foreground text-sm">
              {m.playground_preview_hint()}
            </p>
          )}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">{m.playground_data()}</h2>
          <pre className="border-border max-h-64 overflow-auto rounded-lg border bg-slate-900 p-3 text-xs text-slate-100">
            {result ? JSON.stringify(result, null, 2) : '{}'}
          </pre>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">{m.playground_spec()}</h2>
          <pre className="border-border max-h-64 overflow-auto rounded-lg border bg-slate-900 p-3 text-xs text-slate-100">
            {spec ? JSON.stringify(spec, null, 2) : '{}'}
          </pre>
        </section>
      </div>
    </div>
  )
}
