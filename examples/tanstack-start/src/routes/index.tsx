import { Link, createFileRoute } from '@tanstack/react-router'

import { m } from '#/paraglide/messages'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-xs font-bold tracking-widest text-primary uppercase">
        {m.home_kicker()}
      </p>
      <h1 className="mt-1 text-3xl font-bold">{m.home_title()}</h1>
      <p className="text-muted-foreground mt-3 text-[15px]">{m.home_intro()}</p>
      <Link
        to="/playground"
        className="bg-primary text-primary-foreground mt-6 inline-block rounded-md px-4 py-2 text-sm font-semibold no-underline hover:opacity-90"
      >
        {m.home_cta()}
      </Link>
    </div>
  )
}
