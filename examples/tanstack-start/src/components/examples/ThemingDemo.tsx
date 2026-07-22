import type { CSSProperties } from 'react'

import FormDemo from './FormDemo'
import { contactSpec } from '#/examples/specs'
import { m } from '#/paraglide/messages'

const brandTokens = {
  '--fk-color-primary': '#e0662d',
  '--fk-radius': '14px',
  '--fk-font': 'Georgia, serif',
} as CSSProperties

export default function ThemingDemo() {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">{m.theming_default()}</h2>
        <FormDemo spec={contactSpec} showValidate={false} />
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">{m.theming_brand()}</h2>
        <div data-fk-theme="dark" style={brandTokens} className="rounded-lg bg-slate-900 p-1">
          <FormDemo spec={contactSpec} showValidate={false} />
        </div>
      </section>
    </div>
  )
}
