import { describe, expect, test, mock } from 'bun:test'

// The default bricks import react-native, whose entry point bun's test
// runtime cannot parse (Flow-typed). The components are never rendered
// here, so string stand-ins are enough.
mock.module('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  Switch: 'Switch',
  Modal: 'Modal',
  Pressable: 'Pressable',
  FlatList: 'FlatList',
  ScrollView: 'ScrollView',
  Platform: { OS: 'ios' },
}))

const { createNativeBrick, getNativeBrick, registerNativeBrick } = await import(
  '../lib/registry'
)
const { registerDefaultNativeBricks } = await import('../lib/bricks/defaults')

describe('native registry defaults', () => {
  test('an override registered before the first render survives the defaults', () => {
    const custom = createNativeBrick({
      type: 'input',
      id: 'text',
      render: () => null,
    })
    registerNativeBrick(custom)

    registerDefaultNativeBricks()

    expect(getNativeBrick('input', 'text')).toBe(custom)
    expect(getNativeBrick('input', 'checkbox')).toBeDefined()
    expect(getNativeBrick('panel', 'column')).toBeDefined()
  })
})
