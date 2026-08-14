import type { BrickSpec } from '@streamline-pulse/formkrafter-core'

const column = (key: string, children: BrickSpec[]): BrickSpec => ({
  type: 'panel',
  id: 'column',
  name: 'Form',
  configs: { key },
  children,
})

export const contactSpec: BrickSpec = column('contact', [
  {
    type: 'input',
    dataType: 'string',
    id: 'text',
    name: 'Name',
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
  {
    type: 'input',
    dataType: 'string',
    id: 'textarea',
    name: 'Message',
    configs: { key: 'message', label: 'Message' },
    validations: [{ validator: 'minLength', value: 10 }],
  },
])

export const wizardSpec: BrickSpec = column('wizard', [
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
            name: 'Name',
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
        name: 'Details',
        configs: { key: 's2', label: 'Details' },
        children: [
          {
            type: 'input',
            dataType: 'string',
            id: 'phone',
            name: 'Phone',
            configs: { key: 'phone', label: 'Phone' },
          },
          {
            type: 'input',
            dataType: 'string',
            id: 'text',
            name: 'City',
            configs: { key: 'city', label: 'City' },
            validations: [{ validator: 'required' }],
          },
        ],
      },
      {
        type: 'panel',
        id: 'group',
        name: 'Confirm',
        configs: { key: 's3', label: 'Confirm' },
        children: [
          {
            type: 'output',
            dataType: 'void',
            id: 'content',
            name: 'Content',
            configs: {
              key: 'note',
              content: 'Almost done — confirm and submit.',
            },
          },
          {
            type: 'input',
            dataType: 'boolean',
            id: 'checkbox',
            name: 'Consent',
            configs: { key: 'consent', label: 'I confirm my details' },
            validations: [{ validator: 'required' }],
          },
        ],
      },
    ],
  },
])

export const i18nSpec: BrickSpec = column('i18n', [
  {
    type: 'input',
    dataType: 'string',
    id: 'text',
    name: 'Name',
    configs: {
      key: 'name',
      label: { en: 'Full name', fr: 'Nom complet' },
      placeholder: { en: 'Ada Lovelace', fr: 'Ada Lovelace' },
    },
    validations: [
      {
        validator: 'required',
        message: { en: 'Please give your name', fr: 'Merci d’indiquer votre nom' },
      },
    ],
  },
  {
    type: 'input',
    dataType: 'string',
    id: 'select',
    name: 'Role',
    configs: {
      key: 'role',
      label: { en: 'Role', fr: 'Rôle' },
      optionsSource: 'static',
      options: {
        en: 'Developer\nDesigner\nManager',
        fr: 'Développeur·se\nDesigner\nManager',
      },
    },
    validations: [
      {
        validator: 'required',
        message: { en: 'Pick a role', fr: 'Choisissez un rôle' },
      },
    ],
  },
])

export const remoteSpec: BrickSpec = column('remote', [
  {
    type: 'input',
    dataType: 'string',
    id: 'select',
    name: 'Author',
    configs: {
      key: 'author',
      label: 'Author (jsonplaceholder /users)',
      optionsSource: 'remote',
      optionsUrl: 'https://jsonplaceholder.typicode.com/users',
      labelKey: 'name',
      valueKey: 'id',
      searchParam: 'q',
    },
  },
  {
    type: 'input',
    dataType: 'string',
    id: 'select',
    name: 'Post',
    configs: {
      key: 'post',
      label: 'Their posts (/posts?userId={author})',
      optionsSource: 'remote',
      optionsUrl: 'https://jsonplaceholder.typicode.com/posts?userId={author}',
      labelKey: 'title',
      valueKey: 'id',
    },
  },
])

export const gridSpec: BrickSpec = column('grid', [
  {
    type: 'collection',
    dataType: 'array',
    id: 'data-grid',
    name: 'Contacts',
    configs: { key: 'contacts', label: 'Team contacts' },
    validations: [{ validator: 'minItems', value: 1 }],
    children: [
      {
        type: 'input',
        dataType: 'string',
        id: 'text',
        name: 'Name',
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
      {
        type: 'input',
        dataType: 'string',
        id: 'select',
        name: 'Role',
        configs: {
          key: 'role',
          label: 'Role',
          optionsSource: 'static',
          options: 'Developer\nDesigner\nManager',
        },
      },
    ],
  },
])

export const authSpec: BrickSpec = column('auth', [
  {
    type: 'input',
    dataType: 'string',
    id: 'select',
    name: 'Secured options',
    configs: {
      key: 'secured',
      label: 'Secured select',
      optionsSource: 'remote',
      optionsUrl: 'https://demo.internal/api/options?tenant={_tenant}',
      optionsHeaders: 'Authorization: Bearer {_authToken}\nX-Tenant: {_tenant}',
    },
  },
  {
    type: 'input',
    dataType: 'string',
    id: 'text',
    name: 'Note',
    configs: { key: 'note', label: 'Public field' },
  },
])

export const rulesSpec: BrickSpec = column('rules', [
  {
    type: 'input',
    dataType: 'string',
    id: 'select',
    name: 'Channel',
    configs: {
      key: 'channel',
      label: 'Preferred channel',
      optionsSource: 'static',
      options: 'Email\nPhone\nOther',
    },
  },
  {
    type: 'input',
    dataType: 'string',
    id: 'text',
    name: 'Other channel',
    configs: { key: 'other', label: 'Which one?' },
    rules: [
      {
        name: 'hide unless Other',
        type: 'jsonLogic',
        logic: { '!=': [{ var: 'channel' }, 'Other'] },
        effects: [{ property: { target: 'hidden', type: 'boolean' }, boolean: true }],
      },
    ],
  },
  {
    type: 'input',
    dataType: 'boolean',
    id: 'checkbox',
    name: 'Lock',
    configs: { key: 'lock', label: 'Lock the nickname' },
  },
  {
    type: 'input',
    dataType: 'string',
    id: 'text',
    name: 'Nickname',
    configs: { key: 'nickname', label: 'Nickname' },
    rules: [
      {
        name: 'disable when locked',
        type: 'jsonLogic',
        logic: { '==': [{ var: 'lock' }, true] },
        effects: [{ property: { target: 'disabled', type: 'boolean' }, boolean: true }],
      },
    ],
  },
  {
    type: 'input',
    dataType: 'number',
    id: 'number',
    name: 'Quantity',
    configs: { key: 'quantity', label: 'Quantity' },
  },
  {
    type: 'input',
    dataType: 'string',
    id: 'text',
    name: 'Tier',
    configs: { key: 'tier', label: 'Tier (computed by a JS rule)' },
    rules: [
      {
        name: 'compute tier',
        type: 'jsonLogic',
        logic: { '!!': { var: 'quantity' } },
        effects: [
          {
            property: { target: 'value', type: 'code' },
            code: 'return dataMap.quantity > 10 ? "GOLD" : "STANDARD";',
          },
        ],
      },
    ],
  },
])

export const ratingSpec: BrickSpec = column('rating', [
  {
    type: 'input',
    dataType: 'string',
    id: 'text',
    name: 'Name',
    configs: { key: 'name', label: 'Your name' },
  },
  {
    type: 'input',
    dataType: 'number',
    id: 'rating',
    name: 'Rating',
    configs: { key: 'rating', label: 'How was it?' },
    validations: [
      { validator: 'required' },
      { validator: 'min', value: 3, message: 'We aim for at least 3 stars 😉' },
    ],
  },
])

export const addressSubSpec: BrickSpec = column('addressSub', [
  {
    type: 'input',
    dataType: 'string',
    id: 'text',
    name: 'Street',
    configs: { key: 'street', label: { en: 'Street', fr: 'Rue' } },
    validations: [{ validator: 'required' }],
  },
  {
    type: 'panel',
    id: 'row',
    name: 'Row',
    configs: { key: 'cityRow' },
    children: [
      {
        type: 'input',
        dataType: 'string',
        id: 'text',
        name: 'City',
        configs: { key: 'city', label: { en: 'City', fr: 'Ville' } },
        validations: [{ validator: 'required' }],
      },
      {
        type: 'input',
        dataType: 'string',
        id: 'text',
        name: 'Zip',
        configs: { key: 'zip', label: { en: 'Zip code', fr: 'Code postal' } },
      },
    ],
  },
])

export const emergencyContactSubSpec: BrickSpec = column('emergencySub', [
  {
    type: 'input',
    dataType: 'string',
    id: 'text',
    name: 'Contact name',
    configs: {
      key: 'contactName',
      label: { en: 'Contact name', fr: 'Nom du contact' },
    },
    validations: [{ validator: 'required' }],
  },
  {
    type: 'input',
    dataType: 'string',
    id: 'phone',
    name: 'Contact phone',
    configs: {
      key: 'contactPhone',
      label: { en: 'Contact phone', fr: 'Téléphone du contact' },
      mask: '99 99 99 99',
    },
  },
])

export const nestedFormSpec: BrickSpec = column('nestedHost', [
  {
    type: 'input',
    dataType: 'string',
    id: 'text',
    name: 'Full name',
    configs: {
      key: 'fullName',
      label: { en: 'Full name', fr: 'Nom complet' },
    },
    validations: [{ validator: 'required' }],
  },
  {
    type: 'panel',
    id: 'nested-form',
    name: 'Nested form',
    configs: {
      key: 'address',
      label: { en: 'Delivery address', fr: 'Adresse de livraison' },
      specRef: 'adresse',
    },
  },
  {
    type: 'panel',
    id: 'nested-form',
    name: 'Nested form',
    configs: {
      key: 'emergency',
      label: { en: 'Emergency contact', fr: "Contact d'urgence" },
      specRef: 'contact-urgence',
    },
  },
])
