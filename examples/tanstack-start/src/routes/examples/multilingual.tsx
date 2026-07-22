import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { ExamplePage } from '#/components/ExamplePage'
import { m } from '#/paraglide/messages'

const Demo = lazy(() => import('#/components/examples/MultilingualForm'))

export const Route = createFileRoute('/examples/multilingual')({
  component: () => (
    <ExamplePage
      component={Demo}
      kicker={m.navg_render}
      title={m.ex_i18nform_title}
      intro={m.ex_i18nform_intro}
    />
  ),
})
