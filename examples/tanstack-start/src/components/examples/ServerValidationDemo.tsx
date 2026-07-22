import { useRef, useState } from 'react'
import type { ComponentRef } from 'react'
import { FkFormRender } from '@streamline-pulse/formkrafter-react'
import '@streamline-pulse/formkrafter-wc/styles.css'

import { m } from '#/paraglide/messages'
import { useLocale } from '#/components/LocaleProvider'
import { contactSpec } from '#/examples/specs'
import { validateOnServer } from '#/lib/server-validate'

import type { ValidationResult } from '@streamline-pulse/formkrafter-core'
import type { DataChangeDetail } from '@streamline-pulse/formkrafter-wc'

export default function ServerValidationDemo() {
  const { locale } = useLocale()
  const renderRef = useRef<ComponentRef<typeof FkFormRender>>(null)
  const [clientVerdict, setClientVerdict] = useState<ValidationResult>()
  const [serverVerdict, setServerVerdict] = useState<ValidationResult>()
  const [values, setValues] = useState<Record<string, unknown>>({})

  async function run() {
    const element = renderRef.current
    if (!element) return

    const client = await element.validate()
    setClientVerdict(client)

    const server = await validateOnServer({
      data: { spec: contactSpec, values, locale },
    })
    setServerVerdict(server)
  }

  const verdictBlock = (label: string, verdict?: ValidationResult) => (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold">{label}</h2>
      <pre className="border-border max-h-56 overflow-auto rounded-lg border bg-slate-900 p-3 text-xs text-slate-100">
        {verdict ? JSON.stringify(verdict, null, 2) : '—'}
      </pre>
    </section>
  )

  return (
    <div className="space-y-4">
      <div className="border-border bg-card rounded-lg border p-4">
        <FkFormRender
          ref={renderRef}
          spec={contactSpec}
          locale={locale}
          onFormDataChange={(event: CustomEvent<DataChangeDetail>) =>
            setValues(event.detail.data)
          }
        />
      </div>

      <button
        type="button"
        onClick={run}
        className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-semibold hover:opacity-90"
      >
        {m.demo_run_server()}
      </button>

      <div className="grid gap-4 lg:grid-cols-2">
        {verdictBlock(m.demo_client(), clientVerdict)}
        {verdictBlock(m.demo_server(), serverVerdict)}
      </div>
    </div>
  )
}
