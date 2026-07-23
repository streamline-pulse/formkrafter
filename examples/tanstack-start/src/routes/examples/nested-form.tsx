import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { ExamplePage } from '#/components/ExamplePage'
import { m } from '#/paraglide/messages'

const Demo = lazy(() => import('#/components/examples/NestedFormDemo'))

export const Route = createFileRoute('/examples/nested-form')({
  component: () => (
    <ExamplePage
      component={Demo}
      kicker={m.navg_render}
      title={m.ex_nested_title}
      intro={m.ex_nested_intro}
      templateId="nested-form"
    />
  ),
})
