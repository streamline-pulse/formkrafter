import { useState } from 'react'
import { convertFormioForm } from '@streamline-pulse/formkrafter-core'

import FormDemo from './FormDemo'
import { m } from '#/paraglide/messages'

import type { BrickSpec } from '@streamline-pulse/formkrafter-core'

const sampleFormio = {
  display: 'form',
  name: 'signup',
  components: [
    {
      type: 'textfield',
      key: 'firstName',
      label: 'First name',
      validate: { required: true },
    },
    {
      type: 'email',
      key: 'email',
      label: 'Email',
      validate: { required: true },
    },
    {
      type: 'select',
      key: 'role',
      label: 'Role',
      data: {
        values: [
          { label: 'Developer', value: 'dev' },
          { label: 'Designer', value: 'design' },
          { label: 'Other', value: 'other' },
        ],
      },
    },
    {
      type: 'textfield',
      key: 'otherRole',
      label: 'Which role?',
      conditional: { show: true, when: 'role', eq: 'other' },
    },
    {
      type: 'datagrid',
      key: 'contacts',
      label: 'Contacts',
      components: [
        { type: 'textfield', key: 'name', label: 'Name' },
        { type: 'email', key: 'email', label: 'Email' },
      ],
    },
    { type: 'button', key: 'submit', label: 'Submit' },
  ],
}

export default function FormioImportDemo() {
  const [source, setSource] = useState(JSON.stringify(sampleFormio, null, 2))
  const [spec, setSpec] = useState<BrickSpec>()
  const [warnings, setWarnings] = useState<string[]>([])
  const [parseError, setParseError] = useState<string>()

  function convert() {
    try {
      const result = convertFormioForm(JSON.parse(source))
      setSpec(result.spec)
      setWarnings(result.warnings)
      setParseError(undefined)
    } catch (error) {
      setParseError(error instanceof Error ? error.message : String(error))
      setSpec(undefined)
      setWarnings([])
    }
  }

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">{m.fio_source()}</h2>
        <textarea
          value={source}
          onChange={(event) => setSource(event.target.value)}
          spellCheck={false}
          className="border-border h-64 w-full rounded-lg border bg-slate-900 p-3 font-mono text-xs text-slate-100"
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={convert}
            className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-semibold hover:opacity-90"
          >
            {m.fio_convert()}
          </button>
          {parseError ? (
            <p className="text-destructive text-sm font-medium">{parseError}</p>
          ) : null}
        </div>
      </section>

      {warnings.length > 0 ? (
        <section className="border-border bg-card rounded-lg border p-4">
          <h2 className="mb-2 text-sm font-semibold">{m.fio_warnings()}</h2>
          <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-xs">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {spec ? (
        <>
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">{m.fio_result()}</h2>
            <FormDemo spec={spec} />
          </section>
          <details className="border-border rounded-lg border">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold select-none">
              {m.fio_spec()}
            </summary>
            <pre className="max-h-96 overflow-auto border-t border-border bg-slate-900 p-3 text-xs text-slate-100">
              {JSON.stringify(spec, null, 2)}
            </pre>
          </details>
        </>
      ) : null}
    </div>
  )
}
