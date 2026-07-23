import { m } from '#/paraglide/messages'
import {
  authSpec,
  contactSpec,
  gridSpec,
  i18nSpec,
  nestedFormSpec,
  ratingSpec,
  remoteSpec,
  rulesSpec,
  wizardSpec,
} from './specs'

import type { BrickSpec } from '@streamline-pulse/formkrafter-core'

export const templates: Record<string, BrickSpec> = {
  'simple-form': contactSpec,
  wizard: wizardSpec,
  multilingual: i18nSpec,
  'remote-selects': remoteSpec,
  'data-grid': gridSpec,
  'auth-context': authSpec,
  rules: rulesSpec,
  'custom-brick': ratingSpec,
  'nested-form': nestedFormSpec,
}

export interface ExampleEntry {
  slug: string
  nav: () => string
  intro: () => string
  templateId?: string
}

export interface ExampleGroup {
  label: () => string
  entries: ExampleEntry[]
}

export const exampleCatalog: ExampleGroup[] = [
  {
    label: () => m.navg_render(),
    entries: [
      {
        slug: 'simple-form',
        nav: () => m.ex_simple_nav(),
        intro: () => m.ex_simple_intro(),
        templateId: 'simple-form',
      },
      {
        slug: 'wizard',
        nav: () => m.ex_wizard_nav(),
        intro: () => m.ex_wizard_intro(),
        templateId: 'wizard',
      },
      {
        slug: 'multilingual',
        nav: () => m.ex_i18nform_nav(),
        intro: () => m.ex_i18nform_intro(),
        templateId: 'multilingual',
      },
      {
        slug: 'nested-form',
        nav: () => m.ex_nested_nav(),
        intro: () => m.ex_nested_intro(),
        templateId: 'nested-form',
      },
    ],
  },
  {
    label: () => m.navg_data(),
    entries: [
      {
        slug: 'remote-selects',
        nav: () => m.ex_remote_nav(),
        intro: () => m.ex_remote_intro(),
        templateId: 'remote-selects',
      },
      {
        slug: 'data-grid',
        nav: () => m.ex_grid_nav(),
        intro: () => m.ex_grid_intro(),
        templateId: 'data-grid',
      },
      {
        slug: 'auth-context',
        nav: () => m.ex_auth_nav(),
        intro: () => m.ex_auth_intro(),
        templateId: 'auth-context',
      },
    ],
  },
  {
    label: () => m.navg_advanced(),
    entries: [
      {
        slug: 'rules',
        nav: () => m.ex_rules_nav(),
        intro: () => m.ex_rules_intro(),
        templateId: 'rules',
      },
      {
        slug: 'server-validation',
        nav: () => m.ex_server_nav(),
        intro: () => m.ex_server_intro(),
        templateId: 'simple-form',
      },
      {
        slug: 'custom-brick',
        nav: () => m.ex_custom_nav(),
        intro: () => m.ex_custom_intro(),
        templateId: 'custom-brick',
      },
      {
        slug: 'theming',
        nav: () => m.ex_theming_nav(),
        intro: () => m.ex_theming_intro(),
        templateId: 'simple-form',
      },
      {
        slug: 'formio-import',
        nav: () => m.ex_fio_nav(),
        intro: () => m.ex_fio_intro(),
      },
    ],
  },
]
