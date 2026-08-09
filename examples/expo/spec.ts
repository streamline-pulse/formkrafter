import type { BrickSpec } from '@streamline-pulse/formkrafter-core'

export const registrationSpec = {
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
} as unknown as BrickSpec
