import { describe, expect, test, mock } from 'bun:test'

// The bricks import react-native, whose entry bun cannot parse; string
// stand-ins are enough — the contract under test is props in, callbacks
// out, not native rendering.
mock.module('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  Switch: 'Switch',
  Modal: 'Modal',
  Pressable: 'Pressable',
  FlatList: 'FlatList',
  ScrollView: 'ScrollView',
  ActivityIndicator: 'ActivityIndicator',
  Platform: { OS: 'ios' },
}))

const { create, act } = await import('react-test-renderer')
const { textBricks } = await import('../lib/bricks/text.js')
const { checkboxBrick } = await import('../lib/bricks/checkbox.js')
const { radioBrick } = await import('../lib/bricks/radio.js')
const { FormEngine } = await import('../lib/engine/form-engine.js')
import type { NativeBrickProps } from '../lib/registry.js'

const engine = new FormEngine({
  spec: { type: 'panel', id: 'column', name: 'Form', configs: { uid: 'r', key: 'f' } } as never,
})

const props = (overrides: Partial<NativeBrickProps>): NativeBrickProps => ({
  spec: { type: 'input', id: 'x', name: 'X', configs: {} } as never,
  configs: {},
  data: undefined,
  dataMap: {},
  disabled: false,
  engine,
  onDataChange: () => {},
  ...overrides,
})

describe('brick contracts', () => {
  test('the text brick round-trips value and change', () => {
    const seen: unknown[] = []
    const textBrick = textBricks.find((brick) => brick.id === 'text')!
    let renderer!: ReturnType<typeof create>
    act(() => {
      renderer = create(
        textBrick.render(
          props({
            data: 'Ada',
            configs: { label: 'Name' },
            onDataChange: (value) => seen.push(value),
          }),
        ) as React.ReactElement,
      )
    })

    const input = renderer.root.findByType('TextInput' as never)
    expect(input.props.value).toBe('Ada')
    act(() => input.props.onChangeText('Lovelace'))
    expect(seen).toEqual(['Lovelace'])
  })

  test('the number variant parses and empties to undefined', () => {
    const seen: unknown[] = []
    const numberBrick = textBricks.find((brick) => brick.id === 'number')!
    let renderer!: ReturnType<typeof create>
    act(() => {
      renderer = create(
        numberBrick.render(
          props({ onDataChange: (value) => seen.push(value) }),
        ) as React.ReactElement,
      )
    })

    const input = renderer.root.findByType('TextInput' as never)
    act(() => input.props.onChangeText('42'))
    act(() => input.props.onChangeText(''))
    expect(seen).toEqual([42, undefined])
  })

  test('the checkbox flips through the switch', () => {
    const seen: unknown[] = []
    let renderer!: ReturnType<typeof create>
    act(() => {
      renderer = create(
        checkboxBrick.render(
          props({
            data: false,
            configs: { label: 'Terms' },
            onDataChange: (value) => seen.push(value),
          }),
        ) as React.ReactElement,
      )
    })

    const control = renderer.root.findByType('Switch' as never)
    expect(control.props.value).toBe(false)
    act(() => control.props.onValueChange(true))
    expect(seen).toEqual([true])
  })

  test('the radio group selects by option value and shows the error', () => {
    const seen: unknown[] = []
    let renderer!: ReturnType<typeof create>
    act(() => {
      renderer = create(
        radioBrick.render(
          props({
            configs: { label: 'Role', options: 'Engineer\nDesigner' },
            error: 'This field is required',
            onDataChange: (value) => seen.push(value),
          }),
        ) as React.ReactElement,
      )
    })

    const radios = renderer.root
      .findAllByType('Pressable' as never)
      .filter((node) => node.props.accessibilityRole === 'radio')
    expect(radios).toHaveLength(2)
    act(() => radios[1].props.onPress())
    expect(seen).toEqual(['Designer'])

    const texts = renderer.root
      .findAllByType('Text' as never)
      .map((node) => node.props.children)
    expect(texts).toContain('This field is required')
  })
})
