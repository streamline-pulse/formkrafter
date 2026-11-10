import { useState } from 'react'
import { FkFormRender } from '@streamline-pulse/formkrafter-react'
import '@streamline-pulse/formkrafter-wc/styles.css'

import { m } from '#/paraglide/messages'
import { useLocale } from '#/components/LocaleProvider'

import type { BrickSpec, ValidationResult } from '@streamline-pulse/formkrafter-core'
import type { DataChangeDetail } from '@streamline-pulse/formkrafter-wc'

interface FormDemoProps {
  spec: BrickSpec
  data?: Record<string, unknown>
  context?: Record<string, unknown>
  localeOverride?: string
  showValidate?: boolean
}

export default function FormDemo({
  spec,
  data,
  context,
  localeOverride,
  showValidate = true,
}: FormDemoProps) {
  const { locale } = useLocale()
  const [verdict, setVerdict] = useState<ValidationResult>()
  const [submitted, setSubmitted] = useState<DataChangeDetail>()
  // The renderer reports its validity from the first render. Showing it before
  // anyone has typed read as « 2 error(s) » next to a disabled button: the
  // verdict appears once the visitor has asked for it.
  const [attempted, setAttempted] = useState(false)

  return (
    <div className="space-y-4">
      {/* noValidate: the browser's own bubbles would stop the submit before the
          renderer shows its messages under the fields. */}
      <form id="fk-demo" noValidate className="border-border bg-card rounded-lg border p-4">
        <FkFormRender
          spec={spec}
          locale={localeOverride ?? locale}
          data={data}
          context={context}
          onValidityChange={(event) => setVerdict(event.detail)}
          onFormSubmit={(event) => setSubmitted(event.detail)}
        />
      </form>

      {showValidate ? (
        <div className="flex items-center gap-3">
          <button
            type="submit"
            form="fk-demo"
            onClick={() => setAttempted(true)}
            className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-semibold hover:opacity-90"
          >
            {m.demo_validate()}
          </button>
          {attempted && verdict ? (
            <p
              className={
                verdict.valid
                  ? 'text-sm font-medium text-emerald-600 dark:text-emerald-400'
                  : 'text-destructive text-sm font-medium'
              }
            >
              {verdict.valid
                ? m.demo_valid()
                : m.demo_invalid({ count: Object.keys(verdict.errors).length })}
            </p>
          ) : null}
        </div>
      ) : null}

      {submitted ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">{m.demo_payload()}</h2>
          <pre className="border-border max-h-56 overflow-auto rounded-lg border bg-muted p-3 text-xs text-foreground">
            {JSON.stringify(submitted, null, 2)}
          </pre>
        </section>
      ) : null}
    </div>
  )
}
