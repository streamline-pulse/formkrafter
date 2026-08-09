import type { BrickSpec } from '@streamline-pulse/formkrafter-core'

/** A small spec that exercises validation, options and a localized label. */
export const contactSpec: BrickSpec = {
  type: 'panel',
  id: 'column',
  name: 'Contact',
  configs: { uid: 'root', key: 'contact' },
  children: [
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
  ],
}
