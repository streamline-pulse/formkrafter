import type { BrickSpec } from '@streamline-pulse/formkrafter-core'

const column = (key: string, children: BrickSpec[]): BrickSpec => ({
  type: 'panel',
  id: 'column',
  name: 'Form',
  configs: { uid: `${key}-root`, key },
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
      uid: 'c-name',
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
    configs: { uid: 'c-mail', key: 'email', label: 'Email' },
    validations: [{ validator: 'required' }, { validator: 'email' }],
  },
  {
    type: 'input',
    dataType: 'string',
    id: 'select',
    name: 'Select',
    configs: {
      uid: 'c-role',
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
      uid: 'w-step',
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
        configs: { uid: 'w-s1', key: 's1', label: 'Identity' },
        children: [
          {
            type: 'input',
            dataType: 'string',
            id: 'text',
            name: 'Text',
            configs: { uid: 'w-name', key: 'name', label: 'Full name' },
            validations: [{ validator: 'required' }],
          },
          {
            type: 'input',
            dataType: 'string',
            id: 'email',
            name: 'Email',
            configs: { uid: 'w-mail', key: 'email', label: 'Email' },
            validations: [{ validator: 'required' }, { validator: 'email' }],
          },
        ],
      },
      {
        type: 'panel',
        id: 'group',
        name: 'Address',
        configs: { uid: 'w-s2', key: 's2', label: 'Address' },
        children: [
          {
            type: 'input',
            dataType: 'string',
            id: 'text',
            name: 'Text',
            configs: { uid: 'w-city', key: 'city', label: 'City' },
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
      uid: 'r-type',
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
    configs: { uid: 'r-addr', key: 'address', label: 'Shipping address' },
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
    configs: { uid: 'g-rows', key: 'members', label: 'Team members' },
    children: [
      {
        type: 'input',
        dataType: 'string',
        id: 'text',
        name: 'Text',
        configs: { uid: 'g-name', key: 'name', label: 'Name' },
        validations: [{ validator: 'required' }],
      },
      {
        type: 'input',
        dataType: 'string',
        id: 'email',
        name: 'Email',
        configs: { uid: 'g-mail', key: 'email', label: 'Email' },
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
    configs: { uid: 'n-name', key: 'fullName', label: 'Full name' },
    validations: [{ validator: 'required' }],
  },
  {
    type: 'panel',
    id: 'nested-form',
    name: 'Nested form',
    configs: {
      uid: 'n-addr',
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
    configs: { uid: 'a-street', key: 'street', label: 'Street' },
    validations: [{ validator: 'required' }],
  },
  {
    type: 'input',
    dataType: 'string',
    id: 'text',
    name: 'Text',
    configs: { uid: 'a-city', key: 'city', label: 'City' },
  },
])

/** Uses the custom "rating" brick registered by the demo. */
export const customBrickSpec = column('review', [
  {
    type: 'input',
    dataType: 'number',
    id: 'rating',
    name: 'Rating',
    configs: { uid: 'cb-rate', key: 'rating', label: 'How was it?' },
    validations: [{ validator: 'required' }],
  },
  {
    type: 'input',
    dataType: 'string',
    id: 'textarea',
    name: 'Text area',
    configs: { uid: 'cb-note', key: 'comment', label: 'Comment' },
  },
])
