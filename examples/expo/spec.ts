import type { BrickSpec } from '@streamline-pulse/formkrafter-core'

const cast = (value: unknown): BrickSpec => value as BrickSpec

/** Three-step wizard with per-step validation — the shape of real converted forms. */
export const wizardSpec = cast({
  type: 'panel',
  id: 'column',
  name: 'Form',
  configs: { uid: 'root', key: 'form' },
  children: [
    {
      type: 'panel',
      id: 'stepper',
      name: 'Wizard',
      configs: {
        uid: 'wizard',
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
          configs: { uid: 's-identity', key: 'identity', label: 'Identity' },
          children: [
            {
              type: 'input',
              dataType: 'string',
              id: 'text',
              name: 'Text',
              configs: { uid: 'u-name', key: 'fullName', label: 'Full name' },
              validations: [{ validator: 'required' }],
            },
            {
              type: 'input',
              dataType: 'string',
              id: 'email',
              name: 'Email',
              configs: {
                uid: 'u-email',
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
              configs: { uid: 'u-birth', key: 'birthdate', label: 'Birth date' },
              validations: [{ validator: 'required' }],
            },
          ],
        },
        {
          type: 'panel',
          id: 'group',
          name: 'Profile',
          configs: { uid: 's-profile', key: 'profile', label: 'Profile' },
          children: [
            {
              type: 'input',
              dataType: 'string',
              id: 'radio',
              name: 'Radio',
              configs: {
                uid: 'u-role',
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
                uid: 'u-skills',
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
              configs: { uid: 'u-team', key: 'team', label: 'Team (engineers only)' },
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
          configs: { uid: 's-confirm', key: 'confirm', label: 'Confirm' },
          children: [
            {
              type: 'input',
              dataType: 'boolean',
              id: 'checkbox',
              name: 'Checkbox',
              configs: { uid: 'u-terms', key: 'terms', label: 'I accept the terms' },
              validations: [{ validator: 'required' }],
            },
          ],
        },
      ],
    },
  ],
})

/** A flat form exercising the input bricks outside any wizard. */
export const simpleSpec = cast({
  type: 'panel',
  id: 'column',
  name: 'Form',
  configs: { uid: 'root', key: 'form' },
  children: [
    {
      type: 'output',
      dataType: 'void',
      id: 'content',
      name: 'Content',
      configs: {
        uid: 'u-intro',
        content:
          'Every brick below is a native component.\nSame spec format as the web.',
      },
    },
    {
      type: 'input',
      dataType: 'string',
      id: 'text',
      name: 'Text',
      configs: { uid: 'u-company', key: 'company', label: 'Company' },
      validations: [{ validator: 'required' }],
    },
    {
      type: 'input',
      dataType: 'array',
      id: 'tags',
      name: 'Tags',
      configs: {
        uid: 'u-topics',
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
        uid: 'u-channels',
        key: 'channels',
        label: 'Notify me via',
        options: 'Email\nSMS\nPush',
      },
    },
    {
      type: 'input',
      dataType: 'object',
      id: 'address',
      name: 'Address',
      configs: { uid: 'u-address', key: 'address', label: 'Address' },
    },
    {
      type: 'input',
      dataType: 'string',
      id: 'hidden',
      name: 'Hidden',
      configs: { uid: 'u-source', key: 'source' },
    },
  ],
})

/** Inputs on step one, a live recap plus submit on step two. */
export const recapSpec = cast({
  type: 'panel',
  id: 'column',
  name: 'Form',
  configs: { uid: 'root', key: 'form' },
  children: [
    {
      type: 'panel',
      id: 'stepper',
      name: 'Wizard',
      configs: {
        uid: 'wizard',
        key: 'steps',
        validateSteps: true,
        showSubmit: true,
      },
      children: [
        {
          type: 'panel',
          id: 'group',
          name: 'Order',
          configs: { uid: 's-order', key: 'order', label: 'Order' },
          children: [
            {
              type: 'input',
              dataType: 'string',
              id: 'text',
              name: 'Text',
              configs: { uid: 'u-item', key: 'item', label: 'Item' },
              validations: [{ validator: 'required' }],
            },
            {
              type: 'input',
              dataType: 'number',
              id: 'number',
              name: 'Number',
              configs: { uid: 'u-qty', key: 'quantity', label: 'Quantity' },
              validations: [{ validator: 'required' }, { validator: 'min', value: 1 }],
            },
            {
              type: 'input',
              dataType: 'string',
              id: 'select',
              name: 'Select',
              configs: {
                uid: 'u-shipping',
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
              configs: { uid: 'u-gift', key: 'gift', label: 'Gift wrap' },
            },
          ],
        },
        {
          type: 'panel',
          id: 'group',
          name: 'Review',
          configs: { uid: 's-review', key: 'review', label: 'Review' },
          children: [
            {
              type: 'output',
              dataType: 'void',
              id: 'recap',
              name: 'Recap',
              configs: { uid: 'u-recap', label: 'Recap', groupBySections: true },
            },
          ],
        },
      ],
    },
  ],
})
