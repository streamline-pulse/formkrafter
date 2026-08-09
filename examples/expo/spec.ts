import type { BrickSpec } from '@streamline-pulse/formkrafter-core'

export const registrationSpec = {
  type: 'panel',
  id: 'column',
  name: 'Form',
  configs: { uid: 'root', key: 'form' },
  children: [
    {
      type: 'panel',
      id: 'group',
      name: 'Group',
      configs: { uid: 'g-identity', key: 'identity', label: 'Identity' },
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
          dataType: 'number',
          id: 'number',
          name: 'Number',
          configs: { uid: 'u-age', key: 'age', label: 'Age' },
          validations: [{ validator: 'min', value: 18 }],
        },
      ],
    },
    {
      type: 'input',
      dataType: 'string',
      id: 'select',
      name: 'Select',
      configs: {
        uid: 'u-role',
        key: 'role',
        label: 'Role',
        placeholder: 'Pick a role',
        options: 'Engineer\nDesigner\nManager',
      },
      validations: [{ validator: 'required' }],
    },
    {
      type: 'input',
      dataType: 'string',
      id: 'text',
      name: 'Text',
      configs: {
        uid: 'u-team',
        key: 'team',
        label: 'Team (engineers only)',
      },
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
    {
      type: 'input',
      dataType: 'boolean',
      id: 'checkbox',
      name: 'Checkbox',
      configs: {
        uid: 'u-terms',
        key: 'terms',
        label: 'I accept the terms',
      },
    },
  ],
} as unknown as BrickSpec
