import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { ExamplePage } from '#/components/ExamplePage'
import { m } from '#/paraglide/messages'

const Demo = lazy(() => import('#/components/examples/CustomBrickDemo'))

export const Route = createFileRoute('/examples/custom-brick')({
  component: () => (
    <ExamplePage
      component={Demo}
      kicker={m.navg_advanced}
      title={m.ex_custom_title}
      intro={m.ex_custom_intro}
    />
  ),
})
