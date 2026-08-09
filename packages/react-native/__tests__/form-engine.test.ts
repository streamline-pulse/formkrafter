import { describe, expect, test } from 'bun:test'
import type { BrickSpec } from '@streamline-pulse/formkrafter-core'
import { FormEngine } from '../lib/engine/form-engine'

const spec: BrickSpec = {
  type: 'panel',
  id: 'column',
  name: 'Form',
  configs: { uid: 'root', key: 'form' },
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
      configs: { uid: 'u-email', key: 'email', label: 'Email' },
      validations: [{ validator: 'required' }, { validator: 'email' }],
    },
    {
      type: 'input',
      dataType: 'string',
      id: 'text',
      name: 'Mirror',
      configs: { uid: 'u-mirror', key: 'mirror', label: 'Mirror' },
      rules: [
        {
          name: 'mirror-ada',
          type: 'jsonLogic',
          logic: { '===': [{ var: 'fullName' }, 'Ada'] },
          effects: [
            { property: { target: 'value', type: 'string' }, string: 'is-ada' },
          ],
        },
      ],
    },
  ],
} as unknown as BrickSpec

describe('FormEngine', () => {
  test('errors stay hidden until their field is touched', () => {
    const engine = new FormEngine({ spec })
    expect(engine.getSnapshot().errors).toEqual({})

    engine.setValues({ email: 'not-an-email' })
    const { errors } = engine.getSnapshot()
    expect(Object.keys(errors)).toEqual(['email'])
  })

  test('validate() touches every key and reports all errors', () => {
    const engine = new FormEngine({ spec })
    const result = engine.validate()

    expect(result.valid).toBe(false)
    expect(Object.keys(result.errors).sort()).toEqual(['email', 'fullName'])
    expect(Object.keys(engine.getSnapshot().errors).sort()).toEqual([
      'email',
      'fullName',
    ])
  })

  test('a filled form validates and the callback receives the verdict', () => {
    const seen: Array<{ valid: boolean }> = []
    const engine = new FormEngine({
      spec,
      onDataChange: (_data, isValid) => seen.push({ valid: isValid }),
    })

    engine.setValues({ fullName: 'Ada Lovelace' })
    engine.setValues({ email: 'ada@example.com' })

    expect(engine.validate().valid).toBe(true)
    expect(seen.at(-1)?.valid).toBe(true)
  })

  test('value effects from rules run on every change', () => {
    const engine = new FormEngine({ spec })
    engine.setValues({ fullName: 'Ada' })
    expect(engine.getSnapshot().data.mirror).toBe('is-ada')
  })

  test('underscore-prefixed keys never leave through callbacks', () => {
    let published: Record<string, unknown> = {}
    const engine = new FormEngine({
      spec,
      data: { _context: 'secret' },
      onDataChange: (data) => (published = data),
    })

    engine.setValues({ fullName: 'Ada' })
    expect(published.fullName).toBe('Ada')
    expect('_context' in published).toBe(false)
    expect(engine.getSnapshot().data._context).toBe('secret')
  })

  test('collection rows count in the global verdict', () => {
    const gridSpec = {
      type: 'panel',
      id: 'column',
      name: 'Form',
      configs: { uid: 'root', key: 'form' },
      children: [
        {
          type: 'collection',
          dataType: 'array',
          id: 'data-grid',
          name: 'Data grid',
          configs: { uid: 'g', key: 'team', label: 'Team' },
          children: [
            {
              type: 'input',
              dataType: 'string',
              id: 'text',
              name: 'Text',
              configs: { uid: 'g-name', key: 'name', label: 'Name' },
              validations: [{ validator: 'required' }],
            },
          ],
        },
      ],
    } as unknown as BrickSpec

    const engine = new FormEngine({ spec: gridSpec, data: { team: [{}] } })
    expect(engine.getSnapshot().validationEpoch).toBe(0)

    const result = engine.validate()
    expect(result.valid).toBe(false)
    expect(Object.keys(result.errors)).toEqual(['team[0].name'])
    expect(engine.getSnapshot().validationEpoch).toBe(1)

    engine.setValues({ team: [{ name: 'Ada' }] })
    expect(engine.validate().valid).toBe(true)
  })

  test('an undefined spec never reaches the WeakMap-backed validators', () => {
    const engine = new FormEngine({ spec: undefined as unknown as typeof spec })
    expect(engine.validate()).toEqual({ valid: true, errors: {} })
    engine.setValues({ anything: 'x' })
    expect(engine.getSnapshot().errors).toEqual({})
  })

  test('submit() runs the onSubmit callback with the verdict', () => {
    let verdict: boolean | undefined
    const engine = new FormEngine({
      spec,
      onSubmit: (_data, isValid) => (verdict = isValid),
    })

    engine.submit()
    expect(verdict).toBe(false)
  })
})
