import { beforeAll, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';

const tick = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

const spec = () => ({
  type: 'panel',
  id: 'column',
  name: 'Form',
  configs: { uid: 'root', key: 'form' },
  children: [
    { type: 'input', dataType: 'object', id: 'key-value', name: 'Key / value', configs: { uid: 'k', key: 'donnees', label: 'Données' } },
    { type: 'input', dataType: 'string', id: 'textarea', name: 'Text area', configs: { uid: 't', key: 'brut', label: 'Brut', description: 'JSON brut ou texte' } },
    {
      type: 'collection', dataType: 'array', id: 'data-grid', name: 'Grid', configs: { uid: 'g', key: 'notifications', label: 'Notifications' },
      children: [{ type: 'input', dataType: 'string', id: 'textarea', name: 'Text area', configs: { uid: 'g1', key: 'template', label: 'Template' } }],
    },
  ],
});

type RenderEl = HTMLElement & { spec: unknown; data?: Record<string, unknown>; context?: Record<string, unknown> };

beforeAll(async () => {
  const window = new Window({ url: 'http://localhost/' });
  for (const key of [
    'document', 'HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLButtonElement', 'Element', 'Node', 'customElements', 'CustomEvent',
    'Event', 'KeyboardEvent', 'MouseEvent', 'MutationObserver', 'requestAnimationFrame', 'cancelAnimationFrame',
    'getComputedStyle', 'navigator', 'location', 'CSSStyleSheet', 'ShadowRoot', 'DocumentFragment',
  ]) {
    const value = (window as unknown as Record<string, unknown>)[key];
    if (value !== undefined) (globalThis as Record<string, unknown>)[key] = value;
  }
  (globalThis as Record<string, unknown>).window = window;
  (await import('../dist/components/fk-form-render.js')).defineCustomElement();
});

describe('key / value brick, JSON in text fields and variables inside grids', () => {
  let el: RenderEl;
  let last: Record<string, unknown> | undefined;

  beforeAll(async () => {
    el = document.createElement('fk-form-render') as RenderEl;
    el.spec = spec();
    el.data = { donnees: { url: '{{VERIFICATION_URL}}' }, brut: { a: 1 }, notifications: [{ template: 'Bonjour' }] };
    el.context = { _variables: [{ name: 'RECORD_ID', label: 'Référence' }, { name: 's$nom', label: 'Nom' }] };
    document.body.appendChild(el);
    el.addEventListener('formDataChange', (event) => {
      last = (event as CustomEvent).detail?.data;
    });
    await tick(300);
  });

  test('existing pairs are listed, a new named row joins the object, an unnamed one does not', async () => {
    const keys = () => [...el.querySelectorAll('.fk-kv__key')] as HTMLInputElement[];
    expect(keys().map((k) => k.value)).toEqual(['url']);
    (el.querySelector('.fk-kv__add') as HTMLButtonElement).click();
    await tick();
    expect(keys().length).toBe(2);
    const values = [...el.querySelectorAll('.fk-kv__value input')] as HTMLInputElement[];
    values[1].value = '{{s$nom}}';
    values[1].dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    expect(last?.donnees).toEqual({ url: '{{VERIFICATION_URL}}' });
    keys()[1].value = 'nom';
    keys()[1].dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    expect(last?.donnees).toEqual({ url: '{{VERIFICATION_URL}}', nom: '{{s$nom}}' });
    expect(el.querySelectorAll('.fk-kv__value fk-variable-picker').length).toBe(2);
  });

  test('an object stored in a text area shows as JSON instead of [object Object], with its help text', () => {
    const area = el.querySelector('textarea.fk-field__input') as HTMLTextAreaElement;
    expect(area.value).toBe('{\n  "a": 1\n}');
    expect(area.closest('.fk-field')?.querySelector('.fk-field__hint')?.textContent).toBe('JSON brut ou texte');
  });

  test('a text area inside a grid row gets the variable picker from the form context', () => {
    const cell = el.querySelector('.fk-grid__row textarea') as HTMLTextAreaElement;
    expect(cell).toBeTruthy();
    expect(cell.nextElementSibling?.tagName.toLowerCase()).toBe('fk-variable-picker');
  });
});
