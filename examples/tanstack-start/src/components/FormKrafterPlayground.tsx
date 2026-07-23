import { useRef, useState } from 'react'
import type { ComponentRef } from 'react'
import { FkFormBuilder, FkFormRender } from '@streamline-pulse/formkrafter-react'
import {
  frFkTranslations,
  setFkTranslations,
} from '@streamline-pulse/formkrafter-wc'
import '@streamline-pulse/formkrafter-wc/styles.css'

import { m } from '#/paraglide/messages'
import { useLocale } from '#/components/LocaleProvider'
import { registerDemoSpecSource } from '#/examples/nested-source'

import type {
  BrickSpec,
  ValidationResult,
} from '@streamline-pulse/formkrafter-core'
import type { DataChangeDetail, SpecChangeDetail } from '@streamline-pulse/formkrafter-wc'

registerDemoSpecSource()

interface FormKrafterPlaygroundProps {
  initialSpec?: BrickSpec
  draftId?: string
}

let draftKey: string | undefined
let draftSpec: BrickSpec | undefined

export default function FormKrafterPlayground({
  initialSpec,
  draftId,
}: FormKrafterPlaygroundProps) {
  const { locale } = useLocale()
  setFkTranslations(locale === 'fr' ? frFkTranslations : {})

  const [startSpec] = useState<BrickSpec | undefined>(() => {
    if (draftId !== undefined && draftId === draftKey && draftSpec) {
      return structuredClone(draftSpec)
    }
    return initialSpec ? structuredClone(initialSpec) : undefined
  })
  const [spec, setSpec] = useState<BrickSpec | undefined>(
    startSpec ? structuredClone(startSpec) : undefined
  )
  const [result, setResult] = useState<DataChangeDetail | undefined>(undefined)
  const [validity, setValidity] = useState<ValidationResult | undefined>(undefined)
  const renderRef = useRef<ComponentRef<typeof FkFormRender>>(null)

  async function validateForm() {
    const element = renderRef.current
    if (!element) return
    setValidity(await element.validate())
  }

  function handleSpecChange(event: CustomEvent<SpecChangeDetail>) {
    const next = event.detail.spec ? structuredClone(event.detail.spec) : undefined
    setSpec(next)
    if (draftId !== undefined) {
      draftKey = draftId
      draftSpec = next ? structuredClone(next) : undefined
    }
  }

  return (
    <div className="space-y-8">
      <FkFormBuilder
        spec={startSpec ? structuredClone(startSpec) : undefined}
        onSpecChange={handleSpecChange}
        locales={['en', 'fr']}
      />

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{m.playground_preview()}</h2>
        <div className="border-border bg-card rounded-lg border p-4">
          {spec ? (
            <>
              <FkFormRender
                ref={renderRef}
                spec={spec}
                locale={locale}
                onFormDataChange={(event) => setResult(event.detail)}
              />
              <div className="border-border mt-4 flex items-center gap-3 border-t pt-4">
                <button
                  type="button"
                  onClick={validateForm}
                  className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-semibold hover:opacity-90"
                >
                  {m.playground_validate()}
                </button>
                {validity ? (
                  <p
                    className={
                      validity.valid
                        ? 'text-sm font-medium text-emerald-600 dark:text-emerald-400'
                        : 'text-destructive text-sm font-medium'
                    }
                  >
                    {validity.valid
                      ? m.playground_valid()
                      : m.playground_invalid({
                          count: Object.keys(validity.errors).length,
                        })}
                  </p>
                ) : null}
              </div>
            </>
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
