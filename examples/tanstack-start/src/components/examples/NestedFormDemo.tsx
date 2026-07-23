import FormDemo from './FormDemo'
import { nestedFormSpec } from '#/examples/specs'
import { registerDemoSpecSource } from '#/examples/nested-source'
import { m } from '#/paraglide/messages'

registerDemoSpecSource()

export default function NestedFormDemo() {
  return (
    <div className="space-y-4">
      <FormDemo spec={nestedFormSpec} />
      <pre className="border-border overflow-auto rounded-lg border bg-slate-900 p-3 text-xs leading-relaxed text-slate-100">
        {`services.specSourceService = {
  fetchSpec: async (ref) => {
    const res = await fetch(\`/api/forms/\${ref}\`)
    return (await res.json()).formSpecs
  },
}`}
      </pre>
      <p className="text-muted-foreground text-xs">{m.ex_nested_note()}</p>
    </div>
  )
}
