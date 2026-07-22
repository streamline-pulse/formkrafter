import { Suspense, useState } from 'react'
import type { ComponentType, LazyExoticComponent } from 'react'
import { Link } from '@tanstack/react-router'

import { m } from '#/paraglide/messages'
import { templates } from '#/examples/catalog'
import { useHydrated } from '#/lib/use-hydrated'

interface ExamplePageProps {
  component: LazyExoticComponent<ComponentType>
  kicker: () => string
  title: () => string
  intro: () => string
  templateId?: string
}

export function ExamplePage({
  component: Demo,
  kicker,
  title,
  intro,
  templateId,
}: ExamplePageProps) {
  const mounted = useHydrated()
  const [copied, setCopied] = useState(false)

  const spec = templateId ? templates[templateId] : undefined
  const specJson = spec ? JSON.stringify(spec, null, 2) : undefined

  async function copySpec() {
    if (!specJson) return
    await navigator.clipboard.writeText(specJson)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

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

      {spec && templateId ? (
        <details className="border-border mt-8 rounded-lg border">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold select-none">
            {m.ex_view_spec()}
          </summary>
          <div className="border-border border-t p-4">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <Link
                to="/playground"
                search={{ template: templateId }}
                className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm font-semibold no-underline hover:opacity-90"
              >
                {m.ex_open_playground()}
              </Link>
              <button
                type="button"
                onClick={copySpec}
                className="border-border rounded-md border px-3 py-1.5 text-sm font-medium"
              >
                {copied ? m.ex_copied_spec() : m.ex_copy_spec()}
              </button>
            </div>
            <pre className="max-h-96 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
              {specJson}
            </pre>
          </div>
        </details>
      ) : null}
    </div>
  )
}
