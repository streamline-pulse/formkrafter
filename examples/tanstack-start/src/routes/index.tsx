import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight, Hammer } from 'lucide-react'

import { m } from '#/paraglide/messages'
import { exampleCatalog } from '#/examples/catalog'
import { useLocale } from '#/components/LocaleProvider'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  // Subscribes to locale changes: this component reads paraglide
  // messages during render, and nothing remounts on a language switch.
  useLocale()
  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-10">
        <p className="text-xs font-bold tracking-widest text-primary uppercase">
          {m.home_kicker()}
        </p>
        <h1 className="mt-1 text-3xl font-bold">{m.home_title()}</h1>
        <p className="text-muted-foreground mt-3 max-w-2xl text-[15px]">
          {m.home_intro()}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Link
            to="/playground"
            className="bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold no-underline hover:opacity-90"
          >
            <Hammer className="size-4" />
            {m.home_cta()}
          </Link>
          <span className="text-muted-foreground text-sm">
            {m.home_playground_hint()}
          </span>
        </div>
      </header>

      <h2 className="mb-4 text-xl font-bold">{m.home_examples_title()}</h2>

      {exampleCatalog.map((group) => (
        <section key={group.label()} className="mb-8">
          <p className="text-muted-foreground mb-3 text-xs font-bold tracking-widest uppercase">
            {group.label()}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {group.entries.map((entry) => (
              <article
                key={entry.slug}
                className="border-border bg-card flex flex-col rounded-xl border p-5"
              >
                <h3 className="font-semibold">{entry.nav()}</h3>
                <p className="text-muted-foreground mt-1 flex-1 text-sm">
                  {entry.intro()}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-medium">
                  <Link
                    to={`/examples/${entry.slug}` as '/'}
                    className="text-primary inline-flex items-center gap-1 no-underline hover:underline"
                  >
                    {m.ex_view_page()}
                    <ArrowRight className="size-3.5" />
                  </Link>
                  {entry.templateId ? (
                    <Link
                      to="/playground"
                      search={{ template: entry.templateId }}
                      className="text-muted-foreground no-underline hover:underline"
                    >
                      {m.ex_open_playground()}
                    </Link>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
