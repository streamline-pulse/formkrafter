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
      validations: [{ validator: 'required' }],
    },
    {
      type: 'input',
      dataType: 'string',
      id: 'select',
      name: 'Role',
      configs: {
        uid: 'b',
        key: 'role',
        label: 'Role',
        optionsSource: 'static',
        options: [
          { label: 'Developer', value: 'dev' },
          { label: 'Designer', value: 'design' },
          { label: 'Manager', value: 'mgr' },
        ],
      },
    },
  ],
});

let renderEl: HTMLElement & {
  spec?: unknown;
  validate: () => Promise<{ valid: boolean }>;
};
let lastEmitted: Record<string, unknown> | undefined;

const keydown = (target: Element, key: string) => {
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
  );
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

describe('combobox accessibility', () => {
  test('trigger exposes the combobox pattern', () => {
    const trigger = renderEl.querySelector('[role="combobox"]')!;
    expect(trigger).toBeTruthy();
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('tabindex')).toBe('0');
    expect(trigger.getAttribute('aria-controls')).toContain('listbox');
  });

  test('keyboard: ArrowDown opens, arrows move, Enter picks', async () => {
    const trigger = renderEl.querySelector(
      '.fk-select__trigger'
    ) as HTMLElement;

    keydown(trigger, 'ArrowDown');
    await tick();

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const search = renderEl.querySelector('.fk-select__search')!;
    const listbox = renderEl.querySelector('[role="listbox"]')!;
    expect(listbox.id).toBe(trigger.getAttribute('aria-controls'));

    const options = renderEl.querySelectorAll('[role="option"]');
    expect(options.length).toBe(3);
    expect(options[0].className).toContain('fk-select__option--active');
    expect(search.getAttribute('aria-activedescendant')).toBe(options[0].id);

    keydown(search, 'ArrowDown');
    await tick();
    expect(
      renderEl.querySelectorAll('[role="option"]')[1].className
    ).toContain('fk-select__option--active');

    keydown(search, 'Enter');
    await tick();

    expect(lastEmitted?.role).toBe('design');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  test('Escape closes the dropdown', async () => {
    const trigger = renderEl.querySelector(
      '.fk-select__trigger'
    ) as HTMLElement;

    keydown(trigger, 'ArrowDown');
    await tick();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    const search = renderEl.querySelector('.fk-select__search')!;
    keydown(search, 'Escape');
    await tick();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('error accessibility', () => {
  test('errors render as alerts and inputs get aria-invalid', async () => {
    await renderEl.validate();
    await tick();

    const alert = renderEl.querySelector('.fk-field__error');
    expect(alert).toBeTruthy();
    expect(alert!.getAttribute('role')).toBe('alert');

    const input = renderEl.querySelector('input[type="text"]')!;
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });
});
