import { describe, expect, test, mock } from 'bun:test'

// Interaction-level tests: open the sheet, search, toggle, add rows, get
// gated by validation — the component state machines, not just prop
// round-trips. Rendered through react-test-renderer over string stand-ins
// for the react-native primitives; list rows are driven by invoking
// FlatList's renderItem, which is exactly what the native list does.
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

;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const { create, act } = await import('react-test-renderer')
const { selectBrick, multiSelectBrick } = await import('../lib/bricks/select.js')
const { tagsBrick } = await import('../lib/bricks/tags.js')
const { dataGridBrick } = await import('../lib/bricks/data-grid.js')
const { stepperBrick } = await import('../lib/bricks/stepper.js')
const { FormEngine } = await import('../lib/engine/form-engine.js')
const { textBricks } = await import('../lib/bricks/text.js')
const { registerNativeBricks } = await import('../lib/registry.js')

// The grid renders its row children through the global registry.
registerNativeBricks([...textBricks])
import type { NativeBrick, NativeBrickProps } from '../lib/registry.js'
import type { BrickSpec } from '@streamline-pulse/formkrafter-core'

type Renderer = ReturnType<typeof create>
type Node = Renderer['root']

const plainEngine = () =>
  new FormEngine({
    spec: {
      type: 'panel',
      id: 'column',
      name: 'Form',
      configs: { uid: 'r', key: 'f' },
    } as never,
  })

const props = (overrides: Partial<NativeBrickProps>): NativeBrickProps => ({
  spec: { type: 'input', id: 'x', name: 'X', configs: {} } as never,
  configs: {},
  data: undefined,
  dataMap: {},
  disabled: false,
  engine: plainEngine(),
  onDataChange: () => {},
  ...overrides,
})

const render = (brick: NativeBrick, p: NativeBrickProps): Renderer => {
  let renderer!: Renderer
  act(() => {
    renderer = create(brick.render(p) as React.ReactElement)
  })
  return renderer
}

const pressables = (root: Node) => root.findAllByType('Pressable' as never)
const modal = (root: Node) => root.findByType('Modal' as never)
const rows = (root: Node) => {
  const list = root.findByType('FlatList' as never)
  return (list.props.data as { label: string; value: string }[]).map(
    (item: never) => list.props.renderItem({ item }),
  )
}

describe('select interactions', () => {
  const selectProps = (onDataChange: (v: unknown) => void, data?: unknown) =>
    props({
      data,
      configs: { label: 'Role', options: 'Engineer\nDesigner\nManager' },
      onDataChange,
    })

  test('the sheet opens, search filters, picking closes and emits', () => {
    const seen: unknown[] = []
    const renderer = render(selectBrick, selectProps((v) => seen.push(v)))

    expect(modal(renderer.root).props.visible).toBe(false)
    act(() => pressables(renderer.root)[0].props.onPress())
    expect(modal(renderer.root).props.visible).toBe(true)

    const search = renderer.root.findByType('TextInput' as never)
    act(() => search.props.onChangeText('des'))
    const filtered = renderer.root.findByType('FlatList' as never).props.data
    expect(filtered.map((option: { label: string }) => option.label)).toEqual([
      'Designer',
    ])

    const [row] = rows(renderer.root)
    act(() => row.props.onPress())
    expect(seen).toEqual(['Designer'])
    expect(modal(renderer.root).props.visible).toBe(false)
  })

  test('the multi select toggles values and stays open', () => {
    const seen: unknown[][] = []
    // Controlled like the real renderer: re-render with the emitted value.
    // onChange only fires after the renderer exists.
    const onChange = (v: unknown) => {
      seen.push(v as unknown[])
      act(() => renderer.update(
        multiSelectBrick.render(selectProps(onChange, v)) as React.ReactElement,
      ))
    }
    const renderer = render(multiSelectBrick, selectProps(onChange, []))

    act(() => pressables(renderer.root)[0].props.onPress())
    act(() => rows(renderer.root)[0].props.onPress())
    act(() => rows(renderer.root)[2].props.onPress())
    act(() => rows(renderer.root)[0].props.onPress())

    expect(seen).toEqual([['Engineer'], ['Engineer', 'Manager'], ['Manager']])
    expect(modal(renderer.root).props.visible).toBe(true)
  })
})

describe('tags interactions', () => {
  test('submit adds, duplicates are ignored, the chip cross removes', () => {
    const seen: unknown[] = []
    const tagProps = (data: unknown) =>
      props({ data, configs: { label: 'Topics' }, onDataChange: (v) => seen.push(v) })

    let renderer = render(tagsBrick, tagProps([]))
    const input = () => renderer.root.findByType('TextInput' as never)

    act(() => input().props.onChangeText('forms'))
    act(() => input().props.onSubmitEditing())
    expect(seen).toEqual([['forms']])

    renderer = render(tagsBrick, tagProps(['forms']))
    act(() => input().props.onChangeText('forms'))
    act(() => input().props.onSubmitEditing())
    expect(seen).toEqual([['forms']]) // duplicate ignored

    act(() => pressables(renderer.root)[0].props.onPress())
    expect(seen).toEqual([['forms'], []])
  })
})

describe('data grid interactions', () => {
  const gridSpec = {
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
  } as unknown as BrickSpec

  test('add row, edit through the row brick, see the row error, remove', () => {
    const seen: unknown[] = []
    const gridProps = (data: unknown) =>
      props({ spec: gridSpec, data, onDataChange: (v) => seen.push(v) })

    let renderer = render(dataGridBrick, gridProps([]))
    const addButton = pressables(renderer.root).at(-1)!
    act(() => addButton.props.onPress())
    expect(seen).toEqual([[{}]])

    renderer = render(dataGridBrick, gridProps([{}]))
    const rowInput = renderer.root.findByType('TextInput' as never)
    act(() => rowInput.props.onChangeText(''))
    // Touched by the edit, empty and required → the row error surfaces.
    const texts = renderer.root
      .findAllByType('Text' as never)
      .map((node) => String(node.props.children))
    expect(texts.some((t) => /required|obligatoire/i.test(t))).toBe(true)

    act(() => rowInput.props.onChangeText('Ada'))
    expect(seen.at(-1)).toEqual([{ name: 'Ada' }])

    const remove = pressables(renderer.root).find(
      (node) => node.props.accessibilityLabel && /remove|supprimer/i.test(node.props.accessibilityLabel),
    )!
    act(() => remove.props.onPress())
    expect(seen.at(-1)).toEqual([])
  })
})

describe('stepper interactions', () => {
  const step = (index: number, required: boolean): BrickSpec =>
    ({
      type: 'panel',
      id: 'group',
      name: `Step ${index}`,
      configs: { uid: `s${index}`, key: `step${index}`, label: `Step ${index}` },
      children: required
        ? [
            {
              type: 'input',
              dataType: 'string',
              id: 'text',
              name: 'Text',
              configs: { uid: `f${index}`, key: `field${index}` },
              validations: [{ validator: 'required' }],
            },
          ]
        : [],
    }) as unknown as BrickSpec

  const wizard = (validateSteps: boolean): BrickSpec =>
    ({
      type: 'panel',
      id: 'stepper',
      name: 'Wizard',
      configs: { uid: 'w', key: 'steps', validateSteps },
      children: [step(0, true), step(1, false)],
    }) as unknown as BrickSpec

  const renderStepper = (spec: BrickSpec, dataMap: Record<string, unknown>) => {
    const engine = new FormEngine({
      spec: {
        type: 'panel',
        id: 'column',
        name: 'Form',
        configs: { uid: 'root', key: 'form' },
        children: [spec],
      } as never,
      data: dataMap,
    })
    const renderer = render(stepperBrick, {
      ...props({ spec, dataMap, engine }),
      children: ['PANE-0', 'PANE-1'],
    })
    return { renderer, engine }
  }

  const visiblePanes = (renderer: Renderer) =>
    JSON.stringify(renderer.toJSON()).match(/PANE-\d/g)

  test('an invalid step blocks Next and reveals its errors', () => {
    const { renderer, engine } = renderStepper(wizard(true), {})

    expect(visiblePanes(renderer)).toEqual(['PANE-0'])
    const next = pressables(renderer.root).at(-1)!
    act(() => next.props.onPress())

    expect(visiblePanes(renderer)).toEqual(['PANE-0'])
    expect(Object.keys(engine.getSnapshot().errors)).toEqual(['field0'])
  })

  test('a valid step advances, and Back returns freely', () => {
    const { renderer } = renderStepper(wizard(true), { field0: 'filled' })

    act(() => pressables(renderer.root).at(-1)!.props.onPress())
    expect(visiblePanes(renderer)).toEqual(['PANE-1'])

    // With two panes and active=1: two step circles, then Back, then Submit.
    const backButton = pressables(renderer.root)[2]
    act(() => backButton.props.onPress())
    expect(visiblePanes(renderer)).toEqual(['PANE-0'])
  })
})
