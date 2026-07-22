import { createBrick, h, registerBrick } from '@streamline-pulse/formkrafter-wc'

import FormDemo from './FormDemo'
import { ratingSpec } from '#/examples/specs'

registerBrick(
  createBrick({
    type: 'input',
    dataType: 'number',
    id: 'rating',
    name: 'Rating',
    category: 'Inputs',
    defaultConfigs: { label: 'Rating' },
    render: (props) =>
      h(
        'div',
        { class: { 'fk-field': true } },
        h('span', { class: { 'fk-field__label': true } }, String(props.configs?.label ?? 'Rating')),
        h(
          'div',
          { style: { display: 'flex', gap: '4px' } },
          ...[1, 2, 3, 4, 5].map((star) =>
            h(
              'button',
              {
                type: 'button',
                disabled: props.editable || props.disabled,
                onClick: () => props.onDataChange?.(star),
                style: {
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '1.4rem',
                  color:
                    typeof props.data === 'number' && star <= props.data
                      ? 'var(--fk-color-primary)'
                      : 'var(--fk-color-border)',
                },
              },
              '★'
            )
          )
        ),
        props.error ? h('span', { class: { 'fk-field__error': true } }, props.error) : h('span', {}, '')
      ),
  })
)

export default function CustomBrickDemo() {
  return <FormDemo spec={ratingSpec} />
}
