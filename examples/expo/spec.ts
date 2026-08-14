import type { BrickSpec } from '@streamline-pulse/formkrafter-core'

const cast = (value: unknown): BrickSpec => value as BrickSpec

/** Three-step wizard with per-step validation — the shape of real converted forms. */
export const wizardSpec = cast({
  type: 'panel',
  id: 'column',
  name: 'Form',
  configs: { key: 'form' },
  children: [
    {
      type: 'panel',
      id: 'stepper',
      name: 'Wizard',
      configs: {
        key: 'steps',
        validateSteps: true,
        allowStepClick: true,
        showSubmit: true,
      },
      children: [
        {
          type: 'panel',
          id: 'group',
          name: 'Identity',
          configs: { key: 'identity', label: { en: 'Identity', fr: 'Identité' } },
          children: [
            {
              type: 'input',
              dataType: 'string',
              id: 'text',
              name: 'Text',
              configs: { key: 'fullName', label: { en: 'Full name', fr: 'Nom complet' } },
              validations: [{ validator: 'required' }],
            },
            {
              type: 'input',
              dataType: 'string',
              id: 'email',
              name: 'Email',
              configs: {
                key: 'email',
                label: 'Email',
                placeholder: 'you@example.com',
              },
              validations: [{ validator: 'required' }, { validator: 'email' }],
            },
            {
              type: 'input',
              dataType: 'string',
              id: 'date',
              name: 'Date',
              configs: { key: 'birthdate', label: { en: 'Birth date', fr: 'Date de naissance' } },
              validations: [{ validator: 'required' }],
            },
          ],
        },
        {
          type: 'panel',
          id: 'group',
          name: 'Profile',
          configs: { key: 'profile', label: { en: 'Profile', fr: 'Profil' } },
          children: [
            {
              type: 'input',
              dataType: 'string',
              id: 'radio',
              name: 'Radio',
              configs: {
                key: 'role',
                label: 'Role',
                options: 'Engineer\nDesigner\nManager',
              },
              validations: [{ validator: 'required' }],
            },
            {
              type: 'input',
              dataType: 'array',
              id: 'multi-select',
              name: 'Multi select',
              configs: {
                key: 'skills',
                label: 'Skills',
                placeholder: 'Pick a few',
                options: 'TypeScript\nReact Native\nDesign systems\nAccessibility',
              },
            },
            {
              type: 'input',
              dataType: 'string',
              id: 'text',
              name: 'Text',
              configs: { key: 'team', label: 'Team (engineers only)' },
              rules: [
                {
                  name: 'engineers-only',
                  type: 'jsonLogic',
                  logic: { '!==': [{ var: 'role' }, 'Engineer'] },
                  effects: [
                    { property: { target: 'hidden', type: 'boolean' }, boolean: true },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'panel',
          id: 'group',
          name: 'Confirm',
          configs: { key: 'confirm', label: { en: 'Confirm', fr: 'Confirmer' } },
          children: [
            {
              type: 'input',
              dataType: 'boolean',
              id: 'checkbox',
              name: 'Checkbox',
              configs: { key: 'terms', label: { en: 'I accept the terms', fr: "J'accepte les conditions" } },
              validations: [{ validator: 'required' }],
            },
          ],
        },
      ],
    },
  ],
})

/** A tabbed form exercising the input bricks outside any wizard. */
export const simpleSpec = cast({
  type: 'panel',
  id: 'column',
  name: 'Form',
  configs: { key: 'form' },
  children: [
    {
      type: 'output',
      dataType: 'void',
      id: 'content',
      name: 'Content',
      configs: {
        content:
          'Every brick below is a native component.\nSame spec format as the web.',
      },
    },
    {
      type: 'panel',
      id: 'tabs',
      name: 'Tabs',
      configs: { key: 'sections', validateTabs: true },
      children: [
        {
          type: 'panel',
          id: 'group',
          name: 'Fields',
          configs: { key: 'fields', label: { en: 'Fields', fr: 'Champs' } },
          children: [
            {
              type: 'input',
              dataType: 'string',
              id: 'text',
              name: 'Text',
              configs: { key: 'company', label: 'Company' },
              validations: [{ validator: 'required' }],
            },
            {
              type: 'input',
              dataType: 'array',
              id: 'tags',
              name: 'Tags',
              configs: {
                key: 'topics',
                label: 'Topics',
                placeholder: 'Type and press return',
              },
            },
            {
              type: 'input',
              dataType: 'array',
              id: 'select-boxes',
              name: 'Select boxes',
              configs: {
                key: 'channels',
                label: 'Notify me via',
                options: 'Email\nSMS\nPush',
              },
            },
          ],
        },
        {
          type: 'panel',
          id: 'group',
          name: 'Details',
          configs: { key: 'details', label: { en: 'Details', fr: 'Détails' } },
          children: [
            {
              type: 'input',
              dataType: 'object',
              id: 'address',
              name: 'Address',
              configs: { key: 'address', label: 'Address' },
            },
            {
              type: 'input',
              dataType: 'object',
              id: 'file',
              name: 'File',
              configs: {
                key: 'attachment',
                label: { en: 'Attachment', fr: 'Pièce jointe' },
              },
            },
          ],
        },
      ],
    },
    {
      type: 'input',
      dataType: 'string',
      id: 'hidden',
      name: 'Hidden',
      configs: { key: 'source' },
    },
  ],
})

/** Inputs on step one, a live recap plus submit on step two. */
export const recapSpec = cast({
  type: 'panel',
  id: 'column',
  name: 'Form',
  configs: { key: 'form' },
  children: [
    {
      type: 'panel',
      id: 'stepper',
      name: 'Wizard',
      configs: {
        key: 'steps',
        validateSteps: true,
        showSubmit: true,
      },
      children: [
        {
          type: 'panel',
          id: 'group',
          name: 'Order',
          configs: { key: 'order', label: 'Order' },
          children: [
            {
              type: 'input',
              dataType: 'string',
              id: 'text',
              name: 'Text',
              configs: { key: 'item', label: 'Item' },
              validations: [{ validator: 'required' }],
            },
            {
              type: 'input',
              dataType: 'number',
              id: 'number',
              name: 'Number',
              configs: { key: 'quantity', label: 'Quantity' },
              validations: [{ validator: 'required' }, { validator: 'min', value: 1 }],
            },
            {
              type: 'input',
              dataType: 'string',
              id: 'select',
              name: 'Select',
              configs: {
                key: 'shipping',
                label: 'Shipping',
                options: 'Standard\nExpress',
              },
              validations: [{ validator: 'required' }],
            },
            {
              type: 'input',
              dataType: 'boolean',
              id: 'checkbox',
              name: 'Checkbox',
              configs: { key: 'gift', label: 'Gift wrap' },
            },
          ],
        },
        {
          type: 'panel',
          id: 'group',
          name: 'Review',
          configs: { key: 'review', label: 'Review' },
          children: [
            {
              type: 'output',
              dataType: 'void',
              id: 'recap',
              name: 'Recap',
              configs: { label: 'Recap', groupBySections: true },
            },
          ],
        },
      ],
    },
  ],
})

/** Remote HTTP options and a data grid — the data-driven bricks. */
export const dataSpec = cast({
  type: 'panel',
  id: 'column',
  name: 'Form',
  configs: { key: 'form' },
  children: [
    {
      type: 'input',
      dataType: 'string',
      id: 'select',
      name: 'Select',
      configs: {
        key: 'country',
        label: { en: 'Country (remote HTTP)', fr: 'Pays (HTTP distant)' },
        placeholder: { en: 'Pick a country', fr: 'Choisissez un pays' },
        optionsSource: 'remote',
        optionsUrl: 'https://date.nager.at/api/v3/AvailableCountries',
        labelKey: 'name',
        valueKey: 'countryCode',
      },
      validations: [{ validator: 'required' }],
    },
    {
      type: 'collection',
      dataType: 'array',
      id: 'data-grid',
      name: 'Data grid',
      configs: {
        key: 'team',
        label: { en: 'Team members', fr: "Membres de l'équipe" },
      },
      children: [
        {
          type: 'input',
          dataType: 'string',
          id: 'text',
          name: 'Text',
          configs: { key: 'name', label: { en: 'Name', fr: 'Nom' } },
          validations: [{ validator: 'required' }],
        },
        {
          type: 'input',
          dataType: 'string',
          id: 'select',
          name: 'Select',
          configs: {
            key: 'role',
            label: { en: 'Role', fr: 'Rôle' },
            options: 'Engineer\nDesigner\nManager',
          },
        },
      ],
    },
  ],
})

/** A custom brick registered by the application, next to built-ins. */
export const customSpec = cast({
  type: 'panel',
  id: 'column',
  name: 'Form',
  configs: { key: 'form' },
  children: [
    {
      type: 'output',
      dataType: 'void',
      id: 'content',
      name: 'Content',
      configs: {
        content:
          'The stars below are a custom brick registered with registerNativeBrick.',
      },
    },
    {
      type: 'input',
      dataType: 'number',
      id: 'rating',
      name: 'Rating',
      configs: {
        key: 'rating',
        label: { en: 'How was it?', fr: "C'était comment ?" },
      },
      validations: [{ validator: 'required' }],
    },
    {
      type: 'input',
      dataType: 'string',
      id: 'signature',
      name: 'Signature',
      configs: {
        key: 'signature',
        label: { en: 'Sign here', fr: 'Signez ici' },
      },
      validations: [{ validator: 'required' }],
    },
    {
      type: 'input',
      dataType: 'string',
      id: 'textarea',
      name: 'Text area',
      configs: {
        key: 'feedback',
        label: { en: 'Tell us more', fr: 'Dites-nous en plus' },
      },
      rules: [
        {
          name: 'only-when-rated-low',
          type: 'jsonLogic',
          logic: { '>': [{ var: 'rating' }, 3] },
          effects: [
            { property: { target: 'hidden', type: 'boolean' }, boolean: true },
          ],
        },
      ],
    },
  ],
})

/** ~100 bricks generated on the fly — the profiling target. */
export const stressSpec = cast({
  type: 'panel',
  id: 'column',
  name: 'Form',
  configs: { key: 'form' },
  children: Array.from({ length: 12 }, (_, section) => ({
    type: 'panel',
    id: 'group',
    name: 'Group',
    configs: {
      key: `section${section}`,
      label: `Section ${section + 1}`,
    },
    children: Array.from({ length: 8 }, (_, field) => {
      const key = `field_${section}_${field}`
      const kinds = ['text', 'email', 'number', 'select', 'checkbox', 'radio', 'textarea', 'text']
      const id = kinds[field]
      return {
        type: 'input',
        dataType: id === 'number' ? 'number' : id === 'checkbox' ? 'boolean' : 'string',
        id,
        name: id,
        configs: {
          key,
          label: `Field ${section + 1}.${field + 1}`,
          ...(id === 'select' || id === 'radio'
            ? { options: 'Alpha\nBravo\nCharlie' }
            : {}),
        },
        ...(field === 0 ? { validations: [{ validator: 'required' }] } : {}),
      }
    }),
  })),
})
