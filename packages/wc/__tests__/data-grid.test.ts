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
      type: 'collection',
      dataType: 'array',
      id: 'data-grid',
      name: 'Contacts',
      configs: { uid: 'grid', key: 'contacts', label: 'Contacts' },
      children: [
        {
          type: 'input',
          dataType: 'string',
          id: 'text',
          name: 'Name',
          configs: { uid: 'c1', key: 'name', label: 'Name' },
          validations: [{ validator: 'required' }],
        },
        {
          type: 'input',
          dataType: 'string',
          id: 'text',
          name: 'Role',
          configs: { uid: 'c2', key: 'role', label: 'Role' },
        },
      ],
    },
  ],
});

let renderEl: HTMLElement & { spec?: unknown };
let lastData: Record<string, unknown> | undefined;

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
    lastData = structuredClone(
      (event as CustomEvent<{ data: Record<string, unknown> }>).detail.data
    );
  });
  await tick();
});

const rows = () => [...renderEl.querySelectorAll('.fk-grid__row')];

describe('fk-data-grid', () => {
  test('starts empty with an add button', () => {
    expect(rows().length).toBe(0);
    expect(renderEl.querySelector('.fk-grid__empty')).toBeTruthy();
    expect(renderEl.querySelector('.fk-grid__add')).toBeTruthy();
  });

  test('adds rows and scopes typed values per row', async () => {
    (renderEl.querySelector('.fk-grid__add') as HTMLElement).click();
    await tick();
    (renderEl.querySelector('.fk-grid__add') as HTMLElement).click();
    await tick();
    expect(rows().length).toBe(2);

    const firstRowInputs = rows()[0].querySelectorAll('input');
    const secondRowInputs = rows()[1].querySelectorAll('input');

    (firstRowInputs[0] as HTMLInputElement).value = 'Ada';
    firstRowInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
    await tick();

    (secondRowInputs[1] as HTMLInputElement).value = 'CTO';
    secondRowInputs[1].dispatchEvent(new Event('input', { bubbles: true }));
    await tick();

    expect(lastData).toEqual({
      contacts: [{ name: 'Ada' }, { role: 'CTO' }],
    });
  });

  test('removing a row keeps the others intact', async () => {
    (rows()[0].querySelector('.fk-grid__remove') as HTMLElement).click();
    await tick();

    expect(rows().length).toBe(1);
    expect(lastData).toEqual({ contacts: [{ role: 'CTO' }] });
  });

  test('validate() aggregates per-row errors with prefixed keys', async () => {
    const el = renderEl as HTMLElement & {
      validate: () => Promise<{ valid: boolean; errors: Record<string, string> }>;
    };

    const result = await el.validate();
    await tick();

    expect(result.valid).toBe(false);
    expect(result.errors['contacts[0].name']).toBe('This field is required');

    const cellErrors = [...rows()[0].querySelectorAll('.fk-field__error')].map(
      (node) => node.textContent
    );
    expect(cellErrors).toEqual(['This field is required']);
  });

  test('fixing the cell clears the error live', async () => {
    const nameInput = rows()[0].querySelectorAll('input')[0] as HTMLInputElement;
    nameInput.value = 'Grace';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();

    expect(rows()[0].querySelector('.fk-field__error')).toBeNull();
    expect(lastData).toEqual({ contacts: [{ role: 'CTO', name: 'Grace' }] });

    const el = renderEl as HTMLElement & {
      validate: () => Promise<{ valid: boolean }>;
    };
    expect((await el.validate()).valid).toBe(true);
  });
});
