import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { ExamplePage } from '#/components/ExamplePage'
import { m } from '#/paraglide/messages'

const Demo = lazy(() => import('#/components/examples/RemoteSelects'))

export const Route = createFileRoute('/examples/remote-selects')({
  component: () => (
    <ExamplePage
      component={Demo}
      kicker={m.navg_data}
      title={m.ex_remote_title}
      intro={m.ex_remote_intro}
    />
  ),
})
