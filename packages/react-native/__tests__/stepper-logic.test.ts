import { describe, expect, test } from 'bun:test'
import type { BrickSpec } from '@streamline-pulse/formkrafter-core'
import { stepKeys, stepValid } from '../lib/bricks/stepper-logic'

const step = {
  type: 'panel',
  id: 'group',
  name: 'Identity',
  configs: { uid: 's1', key: 'identity' },
  children: [
    {
      type: 'input',
      dataType: 'string',
      id: 'text',
      name: 'Text',
      configs: { uid: 'u-name', key: 'fullName' },
      validations: [{ validator: 'required' }],
    },
    {
      type: 'input',
      dataType: 'string',
      id: 'email',
      name: 'Email',
      configs: { uid: 'u-email', key: 'email' },
      validations: [{ validator: 'email' }],
    },
  ],
} as unknown as BrickSpec

describe('stepper logic', () => {
  test('stepKeys collects every data key inside the step', () => {
    expect(stepKeys(step).sort()).toEqual(['email', 'fullName', 'identity'].sort())
  })

  test('an incomplete step blocks, a complete one passes', () => {
    expect(stepValid(step, 0, {})).toBe(false)
    expect(stepValid(step, 0, { fullName: 'Ada', email: 'ada@example.com' })).toBe(true)
  })

  test('empty strings do not count as present data', () => {
    expect(stepValid(step, 0, { fullName: '' })).toBe(false)
  })
})
