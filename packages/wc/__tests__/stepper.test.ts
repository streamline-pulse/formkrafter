import { beforeAll, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';

const tick = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms));

const spec = () => ({
  type: 'panel',
  id: 'column',
  name: 'Form',
  configs: { uid: 'root', key: 'form' },
  children: [
    {
      type: 'panel',
      id: 'stepper',
      name: 'Wizard',
      configs: {
        uid: 'w',
        key: 'wizard',
        validateSteps: true,
        allowStepClick: false,
        showSubmit: true,
      },
      children: [
        {
          type: 'panel',
          id: 'group',
          name: 'Identity',
          configs: { uid: 's1', key: 'step1', label: 'Identity' },
          children: [
            {
              type: 'input',
              dataType: 'string',
              id: 'text',
              name: 'Name',
              configs: { uid: 'f1', key: 'name', label: 'Name' },
              validations: [{ validator: 'required' }],
            },
          ],
        },
        {
          type: 'panel',
          id: 'group',
          name: 'Details',
          configs: { uid: 's2', key: 'step2', label: 'Details' },
          children: [
            {
              type: 'input',
              dataType: 'string',
              id: 'text',
              name: 'Role',
              configs: { uid: 'f2', key: 'role', label: 'Role' },
            },
          ],
        },
      ],
    },
  ],
});

let renderEl: HTMLElement & { spec?: unknown };
let submitDetail: { isValid: boolean; data: Record<string, unknown> } | undefined;

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

  renderEl = document.createElement('fk-form-render') as typeof renderEl;
  renderEl.spec = spec();
  document.body.appendChild(renderEl);
  renderEl.addEventListener('formSubmit', (event) => {
    submitDetail = structuredClone(
      (event as CustomEvent<{ isValid: boolean; data: Record<string, unknown> }>)
        .detail
    );
  });
  await tick();
});

const steps = () => [...renderEl.querySelectorAll('.fk-stepper__step')];
const activeIndex = () =>
  steps().findIndex((step) =>
    step.className.includes('fk-stepper__step--active')
  );
const buttons = () =>
  [...renderEl.querySelectorAll('.fk-stepper__button')].map(
    (button) => button.textContent?.trim() ?? ''
  );

describe('fk-stepper configs', () => {
  test('next is blocked while the step is invalid and shows errors', async () => {
    expect(activeIndex()).toBe(0);

    const next = [...renderEl.querySelectorAll('.fk-stepper__button')].find(
      (button) => button.textContent?.includes('Next')
    ) as HTMLElement;
    next.click();
    await tick();

    expect(activeIndex()).toBe(0);
    expect(
      renderEl.querySelector('.fk-field__error')?.textContent
    ).toBe('This field is required');
  });

  test('clicking a later step is ignored when allowStepClick is false', async () => {
    (steps()[1] as HTMLElement).click();
    await tick();
    expect(activeIndex()).toBe(0);
  });

  test('a valid step advances and the last step shows submit', async () => {
    const input = renderEl.querySelector('input[type="text"]') as HTMLInputElement;
    input.value = 'Ada';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();

    const next = [...renderEl.querySelectorAll('.fk-stepper__button')].find(
      (button) => button.textContent?.includes('Next')
    ) as HTMLElement;
    next.click();
    await tick();

    expect(activeIndex()).toBe(1);
    expect(buttons().some((label) => label.includes('Submit'))).toBe(true);
  });

  test('submit triggers global validation and emits formSubmit', async () => {
    const submit = [...renderEl.querySelectorAll('.fk-stepper__button')].find(
      (button) => button.textContent?.includes('Submit')
    ) as HTMLElement;
    submit.click();
    await tick(150);

    expect(submitDetail?.isValid).toBe(true);
    expect(submitDetail?.data).toEqual({ name: 'Ada' });
  });
});
