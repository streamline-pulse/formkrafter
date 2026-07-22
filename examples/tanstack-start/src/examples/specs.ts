import type { BrickSpec } from '@streamline-pulse/formkrafter-core'

const column = (key: string, children: BrickSpec[]): BrickSpec => ({
  type: 'panel',
  id: 'column',
  name: 'Form',
  configs: { uid: `${key}-root`, key },
  children,
})

export const contactSpec: BrickSpec = column('contact', [
  {
    type: 'input',
    dataType: 'string',
    id: 'text',
    name: 'Name',
    configs: { uid: 'c-name', key: 'name', label: 'Full name' },
    validations: [{ validator: 'required' }],
  },
  {
    type: 'input',
    dataType: 'string',
    id: 'email',
    name: 'Email',
    configs: { uid: 'c-email', key: 'email', label: 'Email' },
    validations: [{ validator: 'required' }, { validator: 'email' }],
  },
  {
    type: 'input',
    dataType: 'string',
    id: 'textarea',
    name: 'Message',
    configs: { uid: 'c-message', key: 'message', label: 'Message' },
    validations: [{ validator: 'minLength', value: 10 }],
  },
])

export const wizardSpec: BrickSpec = column('wizard', [
  {
    type: 'panel',
    id: 'stepper',
    name: 'Wizard',
    configs: {
      uid: 'w-stepper',
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
            name: 'Name',
            configs: { uid: 'w-name', key: 'name', label: 'Full name' },
            validations: [{ validator: 'required' }],
          },
          {
            type: 'input',
            dataType: 'string',
            id: 'email',
            name: 'Email',
            configs: { uid: 'w-email', key: 'email', label: 'Email' },
            validations: [{ validator: 'required' }, { validator: 'email' }],
          },
        ],
      },
      {
        type: 'panel',
        id: 'group',
        name: 'Details',
        configs: { uid: 'w-s2', key: 's2', label: 'Details' },
        children: [
          {
            type: 'input',
            dataType: 'string',
            id: 'phone',
            name: 'Phone',
            configs: { uid: 'w-phone', key: 'phone', label: 'Phone' },
          },
          {
            type: 'input',
            dataType: 'string',
            id: 'text',
            name: 'City',
            configs: { uid: 'w-city', key: 'city', label: 'City' },
            validations: [{ validator: 'required' }],
          },
        ],
      },
      {
        type: 'panel',
        id: 'group',
        name: 'Confirm',
        configs: { uid: 'w-s3', key: 's3', label: 'Confirm' },
        children: [
          {
            type: 'output',
            dataType: 'void',
            id: 'content',
            name: 'Content',
            configs: {
              uid: 'w-note',
              key: 'note',
              content: 'Almost done — confirm and submit.',
            },
          },
          {
            type: 'input',
            dataType: 'boolean',
            id: 'checkbox',
            name: 'Consent',
            configs: { uid: 'w-consent', key: 'consent', label: 'I confirm my details' },
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
      uid: 'l-name',
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
      uid: 'l-role',
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
      uid: 'r-author',
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
      uid: 'r-post',
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
    configs: { uid: 'g-grid', key: 'contacts', label: 'Team contacts' },
    validations: [{ validator: 'minItems', value: 1 }],
    children: [
      {
        type: 'input',
        dataType: 'string',
        id: 'text',
        name: 'Name',
        configs: { uid: 'g-name', key: 'name', label: 'Name' },
        validations: [{ validator: 'required' }],
      },
      {
        type: 'input',
        dataType: 'string',
        id: 'email',
        name: 'Email',
        configs: { uid: 'g-email', key: 'email', label: 'Email' },
        validations: [{ validator: 'email' }],
      },
      {
        type: 'input',
        dataType: 'string',
        id: 'select',
        name: 'Role',
        configs: {
          uid: 'g-role',
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
      uid: 'a-secured',
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
    configs: { uid: 'a-note', key: 'note', label: 'Public field' },
  },
])

export const rulesSpec: BrickSpec = column('rules', [
  {
    type: 'input',
    dataType: 'string',
    id: 'select',
    name: 'Channel',
    configs: {
      uid: 'ru-channel',
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
    configs: { uid: 'ru-other', key: 'other', label: 'Which one?' },
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
    configs: { uid: 'ru-lock', key: 'lock', label: 'Lock the nickname' },
  },
  {
    type: 'input',
    dataType: 'string',
    id: 'text',
    name: 'Nickname',
    configs: { uid: 'ru-nick', key: 'nickname', label: 'Nickname' },
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
    configs: { uid: 'ru-qty', key: 'quantity', label: 'Quantity' },
  },
  {
    type: 'input',
    dataType: 'string',
    id: 'text',
    name: 'Tier',
    configs: { uid: 'ru-tier', key: 'tier', label: 'Tier (computed by a JS rule)' },
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
    configs: { uid: 'cb-name', key: 'name', label: 'Your name' },
  },
  {
    type: 'input',
    dataType: 'number',
    id: 'rating',
    name: 'Rating',
    configs: { uid: 'cb-rating', key: 'rating', label: 'How was it?' },
    validations: [
      { validator: 'required' },
      { validator: 'min', value: 3, message: 'We aim for at least 3 stars 😉' },
    ],
  },
])
