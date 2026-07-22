import { beforeAll, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';

const tick = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms));

const ratingSpec = () => ({
  type: 'panel',
  id: 'column',
  name: 'Form',
  configs: { uid: 'root', key: 'rating-form' },
  children: [
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
        { validator: 'min', value: 3, message: 'We aim for at least 3 stars' },
      ],
    },
  ],
});

let renderEl: HTMLElement & {
  spec?: unknown;
  validate: () => Promise<{ valid: boolean; errors: Record<string, string> }>;
};
let lastEmitted: { data?: Record<string, unknown>; isValid?: boolean; errors?: Record<string, string> } | undefined;

beforeAll(async () => {
  const window = new Window({ url: 'http://localhost/' });
  for (const key of [
    'document',
    'HTMLElement',
    'Element',
    'Node',
    'customElements',
    'CustomEvent',
    'Event',
    'MutationObserver',
    'requestAnimationFrame',
    'cancelAnimationFrame',
    'getComputedStyle',
    'navigator',
    'location',
    'CSSStyleSheet',
    'ShadowRoot',
    'DocumentFragment',
    'KeyboardEvent',
    'MouseEvent',
  ]) {
    const value = (window as unknown as Record<string, unknown>)[key];
    if (value !== undefined) {
      (globalThis as Record<string, unknown>)[key] = value;
    }
  }
  (globalThis as Record<string, unknown>).window = window;

  (await import('../dist/components/fk-form-render.js')).defineCustomElement();
  (await import('../dist/components/fk-form-builder.js')).defineCustomElement();

  const bootstrap = document.createElement('fk-form-builder');
  document.body.appendChild(bootstrap);
  await tick();
  bootstrap.remove();

  const wc = await import('../dist/components/index.js');
  wc.registerBrick(
    wc.createBrick({
      type: 'input',
      dataType: 'number',
      id: 'rating',
      name: 'Rating',
      category: 'Inputs',
      defaultConfigs: { label: 'Rating' },
      render: (props: {
        configs?: Record<string, unknown>;
        data?: unknown;
        error?: string;
        editable?: boolean;
        disabled?: boolean;
        onDataChange?: (value: unknown) => void;
      }) =>
        wc.h(
          'div',
          { class: { 'fk-field': true } },
          wc.h('span', { class: { 'fk-field__label': true } }, String(props.configs?.label ?? 'Rating')),
          wc.h(
            'div',
            { class: { stars: true } },
            ...[1, 2, 3, 4, 5].map((star) =>
              wc.h(
                'button',
                {
                  type: 'button',
                  class: { star: true },
                  disabled: props.editable || props.disabled,
                  onClick: () => props.onDataChange?.(star),
                },
                '*'
              )
            )
          ),
          props.error ? wc.h('span', { class: { 'fk-field__error': true } }, props.error) : wc.h('span', {}, '')
        ),
    })
  );

  renderEl = document.createElement('fk-form-render') as typeof renderEl;
  renderEl.spec = ratingSpec();
  document.body.appendChild(renderEl);
  renderEl.addEventListener('formDataChange', (event) => {
    lastEmitted = structuredClone((event as CustomEvent<typeof lastEmitted>).detail);
  });
  await tick();
});

describe('custom rating brick', () => {
  test('clicking the 4th star stores 4 and validates clean', async () => {
    const stars = renderEl.querySelectorAll('button.star');
    expect(stars.length).toBe(5);
    expect(renderEl.innerHTML).not.toContain('<undefined>');

    (stars[3] as HTMLButtonElement).click();
    await tick();

    const verdict = await renderEl.validate();
    await tick();

    expect(lastEmitted?.data).toEqual({ rating: 4 });
    expect(verdict.valid).toBe(true);
  });
});
