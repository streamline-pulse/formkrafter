import type { BrickSpec } from '@streamline-pulse/formkrafter-core'

const column = (key: string, children: BrickSpec[]): BrickSpec => ({
  type: 'panel',
  id: 'column',
  name: 'Form',
  configs: { key },
  children,
})

/** Events, validation and a localized label. */
export const contactSpec = column('contact', [
  {
    type: 'input',
    dataType: 'string',
    id: 'text',
    name: 'Text',
    configs: {
      key: 'fullName',
      label: { en: 'Full name', fr: 'Nom complet' },
    },
    validations: [{ validator: 'required' }],
  },
  {
    type: 'input',
    dataType: 'string',
    id: 'email',
    name: 'Email',
    configs: { key: 'email', label: 'Email' },
    validations: [{ validator: 'required' }, { validator: 'email' }],
  },
  {
    type: 'input',
    dataType: 'string',
    id: 'select',
    name: 'Select',
    configs: {
      key: 'role',
      label: 'Role',
      optionsSource: 'static',
      options: 'Developer\nDesigner\nManager',
    },
  },
])

/** A stepper: per-step validation gate plus a Submit that emits formSubmit. */
export const wizardSpec = column('signup', [
  {
    type: 'panel',
    id: 'stepper',
    name: 'Wizard',
    configs: {
      key: 'steps',
      validateSteps: true,
      allowStepClick: false,
      showSubmit: true,
    },
    children: [
      {
        type: 'panel',
        id: 'group',
        name: 'Identity',
        configs: { key: 's1', label: 'Identity' },
        children: [
          {
            type: 'input',
            dataType: 'string',
            id: 'text',
            name: 'Text',
            configs: { key: 'name', label: 'Full name' },
            validations: [{ validator: 'required' }],
          },
          {
            type: 'input',
            dataType: 'string',
            id: 'email',
            name: 'Email',
            configs: { key: 'email', label: 'Email' },
            validations: [{ validator: 'required' }, { validator: 'email' }],
          },
        ],
      },
      {
        type: 'panel',
        id: 'group',
        name: 'Address',
        configs: { key: 's2', label: 'Address' },
        children: [
          {
            type: 'input',
            dataType: 'string',
            id: 'text',
            name: 'Text',
            configs: { key: 'city', label: 'City' },
            validations: [{ validator: 'required' }],
          },
        ],
      },
    ],
  },
])

/** Conditional visibility driven by a rule, evaluated in the sandbox. */
export const rulesSpec = column('order', [
  {
    type: 'input',
    dataType: 'string',
    id: 'select',
    name: 'Select',
    configs: {
      key: 'delivery',
      label: 'Delivery',
      optionsSource: 'static',
      options: 'Pickup\nShipping',
    },
    validations: [{ validator: 'required' }],
  },
  {
    type: 'input',
    dataType: 'string',
    id: 'text',
    name: 'Text',
    configs: { key: 'address', label: 'Shipping address' },
    rules: [
      {
        name: 'only-for-shipping',
        type: 'jsonLogic',
        logic: { '!=': [{ var: 'delivery' }, 'Shipping'] },
        effects: [
          { property: { target: 'hidden', type: 'boolean' }, boolean: true },
        ],
      },
    ],
  },
])

/** A collection: repeating rows, each validated on its own. */
export const gridSpec = column('team', [
  {
    type: 'collection',
    dataType: 'array',
    id: 'data-grid',
    name: 'Data grid',
    configs: { key: 'members', label: 'Team members' },
    children: [
      {
        type: 'input',
        dataType: 'string',
        id: 'text',
        name: 'Text',
        configs: { key: 'name', label: 'Name' },
        validations: [{ validator: 'required' }],
      },
      {
        type: 'input',
        dataType: 'string',
        id: 'email',
        name: 'Email',
        configs: { key: 'email', label: 'Email' },
        validations: [{ validator: 'email' }],
      },
    ],
  },
])

/** Two nested-form bricks resolved through services.specSourceService. */
export const nestedSpec = column('nestedHost', [
  {
    type: 'input',
    dataType: 'string',
    id: 'text',
    name: 'Text',
    configs: { key: 'fullName', label: 'Full name' },
    validations: [{ validator: 'required' }],
  },
  {
    type: 'panel',
    id: 'nested-form',
    name: 'Nested form',
    configs: {
      key: 'address',
      label: 'Delivery address',
      specRef: 'address',
    },
  },
])

/** The spec the demo spec-source serves for the "address" ref. */
export const addressSubSpec = column('address', [
  {
    type: 'input',
    dataType: 'string',
    id: 'text',
    name: 'Text',
    configs: { key: 'street', label: 'Street' },
    validations: [{ validator: 'required' }],
  },
  {
    type: 'input',
    dataType: 'string',
    id: 'text',
    name: 'Text',
    configs: { key: 'city', label: 'City' },
  },
])

/** Uses the custom "rating" brick registered by the demo. */
export const customBrickSpec = column('review', [
  {
    type: 'input',
    dataType: 'number',
    id: 'rating',
    name: 'Rating',
    configs: { key: 'rating', label: 'How was it?' },
    validations: [{ validator: 'required' }],
  },
  {
    type: 'input',
    dataType: 'string',
    id: 'textarea',
    name: 'Text area',
    configs: { key: 'comment', label: 'Comment' },
  },
])
