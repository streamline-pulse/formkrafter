import { beforeAll, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';

const tick = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

const hideWhenGoods = [
  {
    name: 'goods',
    type: 'jsonLogic',
    logic: { '==': [{ var: 'mode' }, 'goods'] },
    effects: [{ property: { target: 'hidden', type: 'boolean' }, boolean: true }],
  },
];

const text = (key: string, extra: Record<string, unknown> = {}) => ({
  type: 'input',
  dataType: 'string',
  id: 'text',
  name: key,
  configs: { key, label: key },
  ...extra,
});

const spec = () => ({
  type: 'panel',
  id: 'column',
  name: 'Form',
  configs: { uid: 'root', key: 'form' },
  children: [
    text('mode'),
    {
      type: 'panel',
      id: 'row',
      name: 'Row',
      configs: { uid: 'row' },
      layout: { columns: 3 },
      children: [text('first', { layout: { span: 2 } }), text('payer', { rules: hideWhenGoods }), text('third')],
    },
    {
      type: 'panel',
      id: 'group',
      name: 'Services',
      configs: { uid: 'services', label: 'Services only' },
      children: [
        { type: 'panel', id: 'row', name: 'Row', configs: { uid: 'empty-row' }, children: [text('provider', { rules: hideWhenGoods })] },
      ],
    },
    {
      type: 'input',
      dataType: 'boolean',
      id: 'checkbox',
      name: 'VAT',
      configs: { key: 'vat', label: 'The supplier charges VAT', description: 'Tick when the invoice shows VAT.' },
      validations: [{ validator: 'required' }],
    },
    {
      type: 'input',
      dataType: 'string',
      id: 'radio',
      name: 'Who',
      configs: { key: 'who', label: 'Who pays?', options: 'Me\nYou', description: 'The one named on the invoice.' },
      validations: [{ validator: 'required' }],
    },
    {
      type: 'input',
      dataType: 'string',
      id: 'select',
      name: 'Operation',
      configs: { key: 'op', label: 'Operation', options: 'A very long operation label\nShort' },
    },
  ],
});

type RenderEl = HTMLElement & { spec: unknown; data?: Record<string, unknown> };

let el: RenderEl;

const hostOf = (key: string): HTMLElement | null =>
  Array.from(el.querySelectorAll<HTMLElement>('fk-brick-render')).find(
    (host) => (host as unknown as { brickSpec?: { configs?: { key?: string } } }).brickSpec?.configs?.key === key
  ) ?? null;

beforeAll(async () => {
  const window = new Window({ url: 'http://localhost/' });
  for (const key of [
    'document', 'HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLSelectElement', 'Element', 'Node', 'customElements', 'CustomEvent',
    'Event', 'KeyboardEvent', 'MouseEvent', 'MutationObserver', 'requestAnimationFrame', 'cancelAnimationFrame',
    'getComputedStyle', 'navigator', 'location', 'CSSStyleSheet', 'ShadowRoot', 'DocumentFragment',
  ]) {
    const value = (window as unknown as Record<string, unknown>)[key];
    if (value !== undefined) (globalThis as Record<string, unknown>)[key] = value;
  }
  (globalThis as Record<string, unknown>).window = window;
  (await import('../dist/components/fk-form-render.js')).defineCustomElement();

  el = document.createElement('fk-form-render') as RenderEl;
  el.data = { mode: 'goods', op: 'A very long operation label' };
  el.spec = spec();
  document.body.appendChild(el);
  await tick(250);
});

describe('layout', () => {
  test('a field hidden by a rule hides its host, so it takes no column in the row', () => {
    const payer = hostOf('payer');
    expect(payer).not.toBeNull();
    expect(payer!.hasAttribute('hidden')).toBe(true);
    expect(payer!.children.length).toBe(0);
    expect(hostOf('third')!.hasAttribute('hidden')).toBe(false);
  });

  test('a group whose fields are all hidden is hidden with its legend', async () => {
    const group = Array.from(el.querySelectorAll<HTMLElement>('fk-brick-render')).find(
      (host) => (host as unknown as { brickSpec?: { configs?: { uid?: string } } }).brickSpec?.configs?.uid === 'services'
    )!;
    expect(group.hasAttribute('hidden')).toBe(true);
    expect(group.querySelector('legend')).toBeNull();
  });

  test('the host is shown again when the rule no longer hides it', async () => {
    el.data = { mode: 'services' };
    await tick();
    const payer = hostOf('payer')!;
    expect(payer.hasAttribute('hidden')).toBe(false);
    expect(payer.querySelector('input')).not.toBeNull();
    expect(el.querySelector('legend')?.textContent).toBe('Services only');
    el.data = { mode: 'goods', op: 'A very long operation label' };
    await tick();
    expect(hostOf('payer')!.hasAttribute('hidden')).toBe(true);
  });

  test('layout.columns fixes the row columns, layout.span widens a child', () => {
    const row = el.querySelector<HTMLElement>('.fk-row')!;
    expect(row.classList.contains('fk-row--columns')).toBe(true);
    expect(row.style.getPropertyValue('--fk-row-columns')).toBe('3');
    expect(hostOf('first')!.style.getPropertyValue('--fk-span')).toBe('2');
    expect(hostOf('third')!.style.getPropertyValue('--fk-span')).toBe('');
  });

  test('a checkbox shows its hint and marks a required box', () => {
    const field = hostOf('vat')!.querySelector('.fk-field--check')!;
    expect(field.classList.contains('fk-field--aligned')).toBe(true);
    expect(field.querySelector('.fk-field__hint')?.textContent).toBe('Tick when the invoice shows VAT.');
    // The hint stays out of the <label>: it describes the box, it does not name it.
    expect(field.querySelector('label .fk-field__hint')).toBeNull();
    expect(field.querySelector('label .fk-field__required')).not.toBeNull();
    expect(field.querySelector('input[type="checkbox"]')?.getAttribute('aria-required')).toBe('true');
  });

  test('radio buttons show their hint and required mark too', () => {
    const field = hostOf('who')!.querySelector('.fk-field')!;
    expect(field.querySelector('.fk-field__hint')?.textContent).toBe('The one named on the invoice.');
    expect(field.querySelector('.fk-field__required')).not.toBeNull();
  });

  test('a select value carries its whole label as a tooltip', () => {
    const value = hostOf('op')!.querySelector('.fk-select__value');
    expect(value?.getAttribute('title')).toBe('A very long operation label');
  });
});
