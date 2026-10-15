import { describe, expect, test, mock } from 'bun:test'

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
const { FormRenderer } = await import('../lib/renderer/form-renderer.js')
const { FormReview } = await import('../lib/renderer/form-review.js')
const { textBricks } = await import('../lib/bricks/text.js')
const { registerNativeBricks } = await import('../lib/registry.js')
import type { BrickSpec } from '@streamline-pulse/formkrafter-core'

registerNativeBricks([...textBricks])

type Renderer = ReturnType<typeof create>

const spec = {
  type: 'panel',
  id: 'column',
  name: 'Form',
  configs: { uid: 'root', key: 'form' },
  children: [
    { type: 'input', dataType: 'string', id: 'text', name: 'Text', configs: { uid: 'n', key: 'fullName', label: 'Full name' } },
    { type: 'input', dataType: 'string', id: 'email', name: 'Email', configs: { uid: 'e', key: 'email', label: 'Email' } },
  ],
} as unknown as BrickSpec

const render = (element: React.ReactElement): Renderer => {
  let renderer!: Renderer
  act(() => {
    renderer = create(element)
  })
  return renderer
}

const texts = (root: Renderer['root']) =>
  root.findAllByType('Text' as never).map((node) => String(node.props.children)).join(' | ')

describe('FormRenderer annotations, notes and editableKeys', () => {
  test('shows the note under the annotated field and locks the others', () => {
    const renderer = render(
      <FormRenderer
        spec={spec}
        data={{ fullName: 'Ada', email: 'ada@x.io' }}
        annotations={{ email: { incorrect: true, comment: 'Bounced' } }}
        notes={{ fullName: { incorrect: true, comment: 'Was misspelled' } }}
        editableKeys={['email']}
      />,
    )
    const all = texts(renderer.root)
    expect(all).toContain('To correct')
    expect(all).toContain('Bounced')
    expect(all).toContain('Flagged in the previous review')
    expect(all).toContain('Was misspelled')
    const inputs = renderer.root.findAllByType('TextInput' as never)
    expect(inputs[0].props.editable).toBe(false)
    expect(inputs[1].props.editable).toBe(true)
  })
})

describe('FormReview', () => {
  test('flags a field, comments it, and unflags it', () => {
    const calls: Array<[Record<string, unknown>, string[]]> = []
    const renderer = render(
      <FormReview
        spec={spec}
        data={{ fullName: 'Ada', email: 'ada@x.io' }}
        onReviewChange={(reviews, flagged) => calls.push([structuredClone(reviews), flagged])}
      />,
    )
    const switches = renderer.root.findAllByType('Switch' as never)
    expect(switches.length).toBe(2)
    act(() => switches[0].props.onValueChange(true))
    expect(calls.at(-1)).toEqual([{ fullName: { incorrect: true } }, ['fullName']])

    const inputs = renderer.root.findAllByType('TextInput' as never)
    const comment = inputs.find((node) => node.props.placeholder === 'Comment for the person who corrects it')
    expect(comment).toBeTruthy()
    act(() => comment!.props.onChangeText('Use the legal name'))
    expect(calls.at(-1)?.[0]).toEqual({ fullName: { incorrect: true, comment: 'Use the legal name' } })

    act(() => renderer.root.findAllByType('Switch' as never)[0].props.onValueChange(false))
    expect(calls.at(-1)?.[1]).toEqual([])
    // Still commented, so the key stays with incorrect: false.
    expect(calls.at(-1)?.[0]).toEqual({ fullName: { incorrect: false, comment: 'Use the legal name' } })
  })
})
