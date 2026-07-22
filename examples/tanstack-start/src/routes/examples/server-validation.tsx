import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { ExamplePage } from '#/components/ExamplePage'
import { m } from '#/paraglide/messages'

const Demo = lazy(() => import('#/components/examples/ServerValidationDemo'))

export const Route = createFileRoute('/examples/server-validation')({
  component: () => (
    <ExamplePage
      component={Demo}
      kicker={m.navg_advanced}
      title={m.ex_server_title}
      intro={m.ex_server_intro}
      templateId="simple-form"
    />
  ),
})
