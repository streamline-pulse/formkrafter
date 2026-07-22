import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { ExamplePage } from '#/components/ExamplePage'
import { m } from '#/paraglide/messages'

const Demo = lazy(() => import('#/components/examples/ThemingDemo'))

export const Route = createFileRoute('/examples/theming')({
  component: () => (
    <ExamplePage
      component={Demo}
      kicker={m.navg_advanced}
      title={m.ex_theming_title}
      intro={m.ex_theming_intro}
      templateId="simple-form"
    />
  ),
})
