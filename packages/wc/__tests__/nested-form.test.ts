import { beforeAll, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';

const tick = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms));

const addressSpec = {
  type: 'panel',
  id: 'column',
  name: 'Address',
  configs: { uid: 'addr-root', key: 'addressForm' },
  children: [
    {
      type: 'input',
      dataType: 'string',
      id: 'text',
      name: 'Street',
      configs: { uid: 'addr-street', key: 'street', label: 'Street' },
      validations: [{ validator: 'required' }],
    },
  ],
};

const hostSpec = {
  type: 'panel',
  id: 'column',
  name: 'Host',
  configs: { uid: 'root', key: 'form' },
  children: [
    {
      type: 'input',
      dataType: 'string',
      id: 'text',
      name: 'Name',
      configs: { uid: 'a', key: 'name', label: 'Name' },
    },
    {
      type: 'panel',
      id: 'nested-form',
      name: 'Nested form',
      configs: {
        uid: 'b',
        key: 'delivery',
        label: 'Delivery address',
        specRef: 'address',
      },
    },
  ],
};

let renderEl: HTMLElement & {
  spec?: unknown;
  validate: () => Promise<{ valid: boolean; errors: Record<string, string> }>;
};

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

  const { services } = await import('../../core/dist/index.js');
  services.specSourceService = {
    fetchSpec: async (ref: string) => {
      if (ref === 'address') return structuredClone(addressSpec);
      throw new Error(`unknown ref ${ref}`);
    },
  };

  (await import('../dist/components/fk-form-render.js')).defineCustomElement();
  (await import('../dist/components/fk-form-builder.js')).defineCustomElement();

  const bootstrap = document.createElement('fk-form-builder');
  document.body.appendChild(bootstrap);
  await tick();
  bootstrap.remove();

  renderEl = document.createElement('fk-form-render') as typeof renderEl;
  renderEl.spec = structuredClone(hostSpec);
  document.body.appendChild(renderEl);
  await tick(150);
});

describe('nested form expansion', () => {
  test('the referenced form renders inline under its label', () => {
    const text = renderEl.textContent ?? '';
    expect(text).toContain('Delivery address');
    expect(text).toContain('Street');

    const inputs = renderEl.querySelectorAll('input[type="text"]');
    expect(inputs.length).toBe(2);
  });

  test('nested fields participate in validation', async () => {
    const verdict = await renderEl.validate();
    expect(verdict.valid).toBe(false);
    expect(verdict.errors.street).toBeDefined();
  });

  test('an unresolvable ref shows an alert instead of crashing', async () => {
    const broken = document.createElement('fk-form-render') as typeof renderEl;
    broken.spec = {
      ...structuredClone(hostSpec),
      children: [
        {
          type: 'panel',
          id: 'nested-form',
          name: 'Nested form',
          configs: { uid: 'x', key: 'x', specRef: 'nope' },
        },
      ],
    };
    document.body.appendChild(broken);
    await tick(150);

    expect(broken.textContent).toContain('unknown ref nope');
    broken.remove();
  });
});
