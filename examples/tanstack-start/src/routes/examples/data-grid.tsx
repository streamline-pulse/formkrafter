import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { ExamplePage } from '#/components/ExamplePage'
import { m } from '#/paraglide/messages'

const Demo = lazy(() => import('#/components/examples/GridDemo'))

export const Route = createFileRoute('/examples/data-grid')({
  component: () => (
    <ExamplePage
      component={Demo}
      kicker={m.navg_data}
      title={m.ex_grid_title}
      intro={m.ex_grid_intro}
    />
  ),
})
