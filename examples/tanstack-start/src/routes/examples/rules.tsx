import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { ExamplePage } from '#/components/ExamplePage'
import { m } from '#/paraglide/messages'

const Demo = lazy(() => import('#/components/examples/RulesDemo'))

export const Route = createFileRoute('/examples/rules')({
  component: () => (
    <ExamplePage
      component={Demo}
      kicker={m.navg_advanced}
      title={m.ex_rules_title}
      intro={m.ex_rules_intro}
      templateId="rules"
    />
  ),
})
