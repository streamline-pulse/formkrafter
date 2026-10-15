import { beforeAll, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';

const tick = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

const TD3 = ['P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<', 'L898902C36UTO7408122F1204159ZE184226B<<<<<10'].join('\n');

const spec = () => ({
  type: 'panel',
  id: 'column',
  name: 'Form',
  configs: { uid: 'root', key: 'form' },
  children: [
    { type: 'input', dataType: 'string', id: 'national-id', name: 'National identifier', configs: { uid: 'n', key: 'nir', label: 'NIR', idFormat: 'fr-nir' }, validations: [{ validator: 'required' }] },
    { type: 'input', dataType: 'object', id: 'mrz', name: 'Travel document (MRZ)', configs: { uid: 'm', key: 'passeport', label: 'Passeport' } },
  ],
});

type RenderEl = HTMLElement & { spec: unknown; data?: Record<string, unknown> };

beforeAll(async () => {
  const window = new Window({ url: 'http://localhost/' });
  for (const key of [
    'document', 'HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'Element', 'Node', 'customElements', 'CustomEvent',
    'Event', 'KeyboardEvent', 'MouseEvent', 'MutationObserver', 'requestAnimationFrame', 'cancelAnimationFrame',
    'getComputedStyle', 'navigator', 'location', 'CSSStyleSheet', 'ShadowRoot', 'DocumentFragment',
  ]) {
    const value = (window as unknown as Record<string, unknown>)[key];
    if (value !== undefined) (globalThis as Record<string, unknown>)[key] = value;
  }
  (globalThis as Record<string, unknown>).window = window;
  (await import('../dist/components/fk-form-render.js')).defineCustomElement();
});

describe('identity bricks', () => {
  let el: RenderEl;
  let last: Record<string, unknown> | undefined;
  let validity: { valid: boolean; errors: unknown[] } | undefined;

  beforeAll(async () => {
    el = document.createElement('fk-form-render') as RenderEl;
    el.spec = spec();
    document.body.appendChild(el);
    el.addEventListener('formDataChange', (event) => {
      last = (event as CustomEvent).detail?.data;
    });
    el.addEventListener('validityChange', (event) => {
      validity = (event as CustomEvent).detail;
    });
    await tick(200);
  });

  test('a national identifier is checked against its format', async () => {
    const input = el.querySelector('input[inputmode="numeric"]') as HTMLInputElement;
    input.value = '269054958815781';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    expect(last?.nir).toBe('269054958815781');
    // The field itself is marked invalid (the error keys do not change, so no new validity event).
    expect((el.querySelector('input[inputmode="numeric"]') as HTMLInputElement).getAttribute('aria-invalid')).toBe('true');
    expect(el.querySelector('.fk-field__error')?.textContent).toContain('Invalid identifier');

    input.value = '2 69 05 49 588 157 80';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    expect((el.querySelector('input[inputmode="numeric"]') as HTMLInputElement).getAttribute('aria-invalid')).not.toBe('true');
  });

  test('a pasted machine-readable zone is parsed, shown and validated', async () => {
    const area = el.querySelector('textarea.fk-mrz__input') as HTMLTextAreaElement;
    area.value = 'nonsense';
    area.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    expect(el.querySelector('.fk-mrz__status--bad')?.textContent).toContain('Zone not recognised');
    expect(validity?.valid).toBe(false);

    area.value = TD3;
    area.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    const value = last?.passeport as { valid: boolean; documentNumber: string; birthDate: string };
    expect(value.valid).toBe(true);
    expect(value.documentNumber).toBe('L898902C3');
    const cells = [...el.querySelectorAll('.fk-mrz__row dd')].map((dd) => dd.textContent);
    expect(cells).toEqual(['L898902C3', 'UTO', 'ERIKSSON', 'ANNA MARIA', '1974-08-12', 'F', '2012-04-15']);
    expect(el.querySelector('.fk-mrz__fields--valid')).toBeTruthy();
    expect(JSON.stringify(validity?.errors ?? [])).not.toContain('Machine-readable');
  });
});
