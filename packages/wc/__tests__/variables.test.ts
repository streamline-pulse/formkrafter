import { beforeAll, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';

const tick = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms));

const spec = () => ({
  type: 'panel',
  id: 'column',
  name: 'Form',
  configs: { uid: 'root', key: 'form' },
  children: [
    { type: 'input', dataType: 'string', id: 'text', name: 'Text', configs: { uid: 's', key: 'subject', label: 'Subject' } },
    { type: 'input', dataType: 'string', id: 'textarea', name: 'Text area', configs: { uid: 't', key: 'template', label: 'Template' } },
    { type: 'input', dataType: 'string', id: 'password', name: 'Password', configs: { uid: 'p', key: 'secret', label: 'Secret' } },
  ],
});

type RenderEl = HTMLElement & { spec: unknown; data?: Record<string, unknown>; context?: Record<string, unknown> };

beforeAll(async () => {
  const window = new Window({ url: 'http://localhost/' });
  for (const key of [
    'document', 'HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'Element', 'Node', 'customElements',
    'CustomEvent', 'Event', 'KeyboardEvent', 'MouseEvent', 'MutationObserver', 'requestAnimationFrame',
    'cancelAnimationFrame', 'getComputedStyle', 'navigator', 'location', 'CSSStyleSheet', 'ShadowRoot', 'DocumentFragment',
  ]) {
    const value = (window as unknown as Record<string, unknown>)[key];
    if (value !== undefined) (globalThis as Record<string, unknown>)[key] = value;
  }
  (globalThis as Record<string, unknown>).window = window;
  (await import('../dist/components/fk-form-render.js')).defineCustomElement();
});

const typeInto = (control: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  control.value = value;
  control.setSelectionRange(value.length, value.length);
  control.dispatchEvent(new Event('input', { bubbles: true }));
};

describe('variable picker', () => {
  let el: RenderEl;
  let last: Record<string, unknown> | undefined;

  beforeAll(async () => {
    el = document.createElement('fk-form-render') as RenderEl;
    el.spec = spec();
    el.context = {
      _variables: [
        { name: 'S1$email', label: 'Demande · Email' },
        { name: 'S1$nom', label: 'Demande · Nom' },
        { name: 'RECORD_ID', label: 'Reference du dossier' },
      ],
    };
    document.body.appendChild(el);
    el.addEventListener('formDataChange', (event) => {
      last = (event as CustomEvent).detail?.data ?? (event as CustomEvent).detail;
    });
    await tick(150);
  });

  test('text and textarea get a picker, the password field does not', () => {
    const pickers = el.querySelectorAll('fk-variable-picker');
    expect(pickers.length).toBe(2);
    const password = el.querySelector('input[type="password"]') as HTMLInputElement;
    expect(password.nextElementSibling?.tagName.toLowerCase()).not.toBe('fk-variable-picker');
  });

  test('typing {{ opens the filtered list and a pick inserts the variable', async () => {
    const input = el.querySelector('input.fk-field__input') as HTMLInputElement;
    typeInto(input, 'Bonjour {{S1');
    await tick();
    const items = [...el.querySelectorAll('.fk-variables__item')] as HTMLElement[];
    expect(items.map((item) => item.querySelector('.fk-variables__name')?.textContent)).toEqual(['S1$email', 'S1$nom']);

    items[1].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    await tick();
    expect(input.value).toBe('Bonjour {{S1$nom}}');
    expect((last as { subject?: string } | undefined)?.subject).toBe('Bonjour {{S1$nom}}');
    expect(el.querySelectorAll('.fk-variables__item').length).toBe(0);
  });

  test('a closed token or a space keeps the list shut', async () => {
    const input = el.querySelector('input.fk-field__input') as HTMLInputElement;
    typeInto(input, 'Ref {{RECORD_ID}} ok');
    await tick();
    expect(el.querySelectorAll('.fk-variables__list').length).toBe(0);
    typeInto(input, 'Ref {{RECORD ID');
    await tick();
    expect(el.querySelectorAll('.fk-variables__list').length).toBe(0);
  });

  test('without variables in the context nothing is added', async () => {
    const bare = document.createElement('fk-form-render') as RenderEl;
    bare.spec = spec();
    document.body.appendChild(bare);
    await tick(150);
    expect(bare.querySelectorAll('fk-variable-picker').length).toBe(0);
    bare.remove();
  });
});
