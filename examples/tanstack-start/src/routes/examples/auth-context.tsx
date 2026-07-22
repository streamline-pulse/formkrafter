import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { ExamplePage } from '#/components/ExamplePage'
import { m } from '#/paraglide/messages'

const Demo = lazy(() => import('#/components/examples/AuthContextDemo'))

export const Route = createFileRoute('/examples/auth-context')({
  component: () => (
    <ExamplePage
      component={Demo}
      kicker={m.navg_data}
      title={m.ex_auth_title}
      intro={m.ex_auth_intro}
      templateId="auth-context"
    />
  ),
})
