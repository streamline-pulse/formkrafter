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
      id: 'text',
      name: 'Name',
      configs: { uid: 'a', key: 'name', label: 'Name' },
    },
  ],
});

let renderEl: HTMLElement & {
  spec?: unknown;
  data?: Record<string, unknown>;
  validate: () => Promise<{ valid: boolean }>;
};
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
  renderEl.data = { _authToken: 'secret-123' };
  document.body.appendChild(renderEl);
  renderEl.addEventListener('formDataChange', (event) => {
    lastEmitted = structuredClone(
      (event as CustomEvent<{ data: Record<string, unknown> }>).detail.data
    );
  });
  await tick();
});

describe('underscore-prefixed context keys', () => {
  test('are excluded from emitted form data but kept internally', async () => {
    const input = renderEl.querySelector('input[type="text"]') as HTMLInputElement;
    input.value = 'Ada';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();

    expect(lastEmitted).toEqual({ name: 'Ada' });
    expect(lastEmitted).not.toHaveProperty('_authToken');
  });

  test('validate() result flow also excludes them', async () => {
    await renderEl.validate();
    await tick();

    expect(lastEmitted).toEqual({ name: 'Ada' });
  });
});
