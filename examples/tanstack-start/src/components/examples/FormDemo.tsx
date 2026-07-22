import { useRef, useState } from 'react'
import type { ComponentRef } from 'react'
import { FkFormRender } from '@streamline-pulse/formkrafter-react'
import '@streamline-pulse/formkrafter-wc/styles.css'

import { m } from '#/paraglide/messages'
import { useLocale } from '#/components/LocaleProvider'

import type { BrickSpec, ValidationResult } from '@streamline-pulse/formkrafter-core'
import type { DataChangeDetail } from '@streamline-pulse/formkrafter-wc'

interface FormDemoProps {
  spec: BrickSpec
  data?: Record<string, unknown>
  localeOverride?: string
  showValidate?: boolean
}

export default function FormDemo({
  spec,
  data,
  localeOverride,
  showValidate = true,
}: FormDemoProps) {
  const { locale } = useLocale()
  const renderRef = useRef<ComponentRef<typeof FkFormRender>>(null)
  const [verdict, setVerdict] = useState<ValidationResult>()
  const [submitted, setSubmitted] = useState<DataChangeDetail>()

  async function validate() {
    const element = renderRef.current
    if (!element) return
    setVerdict(await element.validate())
  }

  return (
    <div className="space-y-4">
      <div className="border-border bg-card rounded-lg border p-4">
        <FkFormRender
          ref={renderRef}
          spec={spec}
          locale={localeOverride ?? locale}
          data={data}
          onFormSubmit={(event) => setSubmitted(event.detail)}
        />
      </div>

      {showValidate ? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={validate}
            className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-semibold hover:opacity-90"
          >
            {m.demo_validate()}
          </button>
          {verdict ? (
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
          <pre className="border-border max-h-56 overflow-auto rounded-lg border bg-slate-900 p-3 text-xs text-slate-100">
            {JSON.stringify(submitted, null, 2)}
          </pre>
        </section>
      ) : null}
    </div>
  )
}
