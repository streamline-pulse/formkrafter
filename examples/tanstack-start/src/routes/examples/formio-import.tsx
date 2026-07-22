import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { ExamplePage } from '#/components/ExamplePage'
import { m } from '#/paraglide/messages'

const Demo = lazy(() => import('#/components/examples/FormioImportDemo'))

export const Route = createFileRoute('/examples/formio-import')({
  component: () => (
    <ExamplePage
      component={Demo}
      kicker={m.navg_advanced}
      title={m.ex_fio_title}
      intro={m.ex_fio_intro}
    />
  ),
})
