import type { CSSProperties, ReactNode } from 'react'
import { FkFormRender } from '@streamline-pulse/formkrafter-react'
import '@streamline-pulse/formkrafter-wc/styles.css'

import { contactSpec } from '#/examples/specs'
import { m } from '#/paraglide/messages'
import { useLocale } from '#/components/LocaleProvider'

const brandStyle = {
  '--fk-color-primary': '#e0662d',
  '--fk-radius': '14px',
  '--fk-font': 'Georgia, serif',
} as CSSProperties

const bootstrapStyle = {
  '--fk-color-primary': '#0d6efd',
  '--fk-color-border': '#ced4da',
  '--fk-radius': '6px',
  '--fk-font': "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
} as CSSProperties

const antStyle = {
  '--fk-color-primary': '#1677ff',
  '--fk-color-border': '#d9d9d9',
  '--fk-radius': '6px',
  '--fk-font': "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
} as CSSProperties

const codeDefault = `import '@streamline-pulse/formkrafter-wc/styles.css'

<FkFormRender spec={spec} />
/* follows the app theme: dark activates with the
   .dark class or data-fk-theme="dark" on any ancestor */`

const codeCss = `.acme-form {
  --fk-color-primary: #e0662d;
  --fk-radius: 14px;
  --fk-font: Georgia, serif;
}

<div className="acme-form">
  <FkFormRender spec={spec} />
</div>`

const codeDark = `<section
  data-fk-theme="dark"
  style={{ background: '#111c24', borderRadius: 12, padding: 16 }}
>
  <FkFormRender spec={spec} />
</section>
/* data-fk-theme="light" re-forces light inside a dark app */`

const codeTailwind = `<div className="[--fk-color-primary:var(--color-violet-600)]
                [--fk-radius:2px]
                [--fk-font:var(--font-mono)]">
  <FkFormRender spec={spec} />
</div>`

const codeBootstrap = `.bootstrap-look {
  --fk-color-primary: #0d6efd;
  --fk-color-border: #ced4da;
  --fk-radius: 6px;
  --fk-font: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}

/* host app already ships Bootstrap? alias its variables: */
.bootstrap-look {
  --fk-color-primary: var(--bs-primary);
  --fk-color-border: var(--bs-border-color);
  --fk-radius: var(--bs-border-radius);
}`

const codeAnt = `/* Ant Design seed tokens, mapped by hand */
.ant-look {
  --fk-color-primary: #1677ff;   /* colorPrimary */
  --fk-color-border: #d9d9d9;    /* colorBorder */
  --fk-radius: 6px;              /* borderRadius */
  --fk-font: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}`

function ThemeCard({
  title,
  desc,
  code,
  children,
}: {
  title: string
  desc: string
  code: string
  children: ReactNode
}) {
  return (
    <section className="border-border bg-card flex flex-col rounded-xl border">
      <header className="px-4 pt-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-muted-foreground mt-1 text-xs">{desc}</p>
      </header>
      <div className="flex-1 p-4">{children}</div>
      <details className="border-border border-t">
        <summary className="text-muted-foreground cursor-pointer px-4 py-2 text-xs font-semibold select-none">
          {m.theming_view_code()}
        </summary>
        <pre className="overflow-auto rounded-b-xl bg-slate-900 p-3 text-xs leading-relaxed text-slate-100">
          {code}
        </pre>
      </details>
    </section>
  )
}

export default function ThemingDemo() {
  const { locale } = useLocale()

  const form = () => <FkFormRender spec={contactSpec} locale={locale} />

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <ThemeCard
          title={m.theming_default()}
          desc={m.theming_default_desc()}
          code={codeDefault}
        >
          {form()}
        </ThemeCard>

        <ThemeCard
          title={m.theming_css_title()}
          desc={m.theming_css_desc()}
          code={codeCss}
        >
          <div style={brandStyle}>{form()}</div>
        </ThemeCard>

        <ThemeCard
          title={m.theming_dark_title()}
          desc={m.theming_dark_desc()}
          code={codeDark}
        >
          <section
            data-fk-theme="dark"
            className="rounded-lg p-4"
            style={{ background: '#111c24' }}
          >
            {form()}
          </section>
        </ThemeCard>

        <ThemeCard
          title={m.theming_tailwind_title()}
          desc={m.theming_tailwind_desc()}
          code={codeTailwind}
        >
          <div className="[--fk-color-primary:var(--color-violet-600)] [--fk-radius:2px] [--fk-font:var(--font-mono)]">
            {form()}
          </div>
        </ThemeCard>

        <ThemeCard
          title={m.theming_bootstrap_title()}
          desc={m.theming_bootstrap_desc()}
          code={codeBootstrap}
        >
          <div
            data-fk-theme="light"
            className="rounded-lg bg-white p-4"
            style={bootstrapStyle}
          >
            {form()}
          </div>
        </ThemeCard>

        <ThemeCard
          title={m.theming_ant_title()}
          desc={m.theming_ant_desc()}
          code={codeAnt}
        >
          <div
            data-fk-theme="light"
            className="rounded-lg bg-white p-4"
            style={antStyle}
          >
            {form()}
          </div>
        </ThemeCard>
      </div>

      <p className="text-muted-foreground border-border bg-card rounded-lg border p-4 text-xs leading-relaxed">
        {m.theming_frameworks_note()}
      </p>
    </div>
  )
}
