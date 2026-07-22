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
      type: 'input',
      dataType: 'string',
      id: 'radio',
      name: 'Confirm',
      configs: {
        uid: 'r1',
        key: 'confirm',
        label: 'Payment received?',
        options: [
          { label: 'Oui', value: 'oui' },
          { label: 'Non', value: 'non' },
        ],
      },
    },
    {
      type: 'input',
      dataType: 'array',
      id: 'select-boxes',
      name: 'Channels',
      configs: {
        uid: 's1',
        key: 'channels',
        label: 'Channels',
        options: [
          { label: 'Email', value: 'em' },
          { label: 'Phone', value: 'ph' },
          { label: 'Mail', value: 'ml' },
        ],
      },
    },
  ],
});

let renderEl: HTMLElement & { spec?: unknown };
let lastEmitted: Record<string, unknown> | undefined;

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
  renderEl.addEventListener('formDataChange', (event) => {
    lastEmitted = structuredClone(
      (event as CustomEvent<{ data: Record<string, unknown> }>).detail.data
    );
  });
  await tick();
});

describe('object-shaped static options', () => {
  test('radio renders one choice per option and stores the value', async () => {
    const radios = renderEl.querySelectorAll('input[type="radio"]');
    expect(radios.length).toBe(2);
    expect(renderEl.textContent).toContain('Oui');
    expect(renderEl.textContent).toContain('Non');
    expect(renderEl.textContent).not.toContain('[object Object]');

    (radios[1] as HTMLInputElement).dispatchEvent(
      new Event('change', { bubbles: true })
    );
    await tick();

    expect(lastEmitted?.confirm).toBe('non');
  });

  test('select-boxes store option values, not labels', async () => {
    const checkboxes = renderEl.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(3);

    (checkboxes[0] as HTMLInputElement).checked = true;
    checkboxes[0].dispatchEvent(new Event('change', { bubbles: true }));
    await tick();

    expect(lastEmitted?.channels).toEqual(['em']);
  });
});
