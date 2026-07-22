import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { ExamplePage } from '#/components/ExamplePage'
import { m } from '#/paraglide/messages'

const Demo = lazy(() => import('#/components/examples/SimpleForm'))

export const Route = createFileRoute('/examples/simple-form')({
  component: () => (
    <ExamplePage
      component={Demo}
      kicker={m.navg_render}
      title={m.ex_simple_title}
      intro={m.ex_simple_intro}
    />
  ),
})
