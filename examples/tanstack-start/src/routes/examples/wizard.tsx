import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { ExamplePage } from '#/components/ExamplePage'
import { m } from '#/paraglide/messages'

const Demo = lazy(() => import('#/components/examples/WizardDemo'))

export const Route = createFileRoute('/examples/wizard')({
  component: () => (
    <ExamplePage
      component={Demo}
      kicker={m.navg_render}
      title={m.ex_wizard_title}
      intro={m.ex_wizard_intro}
      templateId="wizard"
    />
  ),
})
