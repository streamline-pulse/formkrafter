import { beforeAll, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';

const tick = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

const spec = () => ({
  type: 'panel',
  id: 'column',
  name: 'Form',
  configs: { uid: 'root', key: 'form' },
  children: [
    { type: 'input', dataType: 'object', id: 'money', name: 'Amount with currency', configs: { uid: 'm', key: 'frais', label: 'Frais', currencies: 'XOF, EUR', currency: 'XOF' } },
    { type: 'input', dataType: 'string', id: 'iban', name: 'IBAN', configs: { uid: 'i', key: 'rib', label: 'RIB' } },
    { type: 'input', dataType: 'string', id: 'tax-id', name: 'Tax identifier', configs: { uid: 't', key: 'ifu', label: 'IFU', idFormat: 'bj-ifu' } },
  ],
});

type RenderEl = HTMLElement & { spec: unknown; data?: Record<string, unknown> };

beforeAll(async () => {
  const window = new Window({ url: 'http://localhost/' });
  for (const key of [
    'document', 'HTMLElement', 'HTMLInputElement', 'HTMLSelectElement', 'Element', 'Node', 'customElements', 'CustomEvent',
    'Event', 'FocusEvent', 'KeyboardEvent', 'MouseEvent', 'MutationObserver', 'requestAnimationFrame', 'cancelAnimationFrame',
    'getComputedStyle', 'navigator', 'location', 'CSSStyleSheet', 'ShadowRoot', 'DocumentFragment',
  ]) {
    const value = (window as unknown as Record<string, unknown>)[key];
    if (value !== undefined) (globalThis as Record<string, unknown>)[key] = value;
  }
  (globalThis as Record<string, unknown>).window = window;
  (await import('../dist/components/fk-form-render.js')).defineCustomElement();
});

describe('finance bricks', () => {
  let el: RenderEl;
  let last: Record<string, unknown> | undefined;

  beforeAll(async () => {
    el = document.createElement('fk-form-render') as RenderEl;
    el.spec = spec();
    document.body.appendChild(el);
    el.addEventListener('formDataChange', (event) => {
      last = (event as CustomEvent).detail?.data;
    });
    await tick(200);
  });

  test('an amount keeps its currency and the currency can change', async () => {
    const amount = el.querySelector('input.fk-money__amount') as HTMLInputElement;
    const currency = el.querySelector('select.fk-money__currency') as HTMLSelectElement;
    expect([...currency.querySelectorAll('option')].map((o) => o.value)).toEqual(['XOF', 'EUR']);
    amount.value = '2500';
    amount.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    expect(last?.frais).toEqual({ amount: 2500, currency: 'XOF' });
    currency.value = 'EUR';
    currency.dispatchEvent(new Event('change', { bubbles: true }));
    await tick();
    expect(last?.frais).toEqual({ amount: 2500, currency: 'EUR' });
    amount.value = '';
    amount.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    expect(last?.frais ?? undefined).toBeUndefined();
  });

  test('an IBAN is upper-cased, checked and grouped by four on blur', async () => {
    const iban = el.querySelector('input.fk-iban__input') as HTMLInputElement;
    iban.value = 'gb82west12345698765433';
    iban.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    expect(last?.rib).toBe('GB82WEST12345698765433');
    expect(iban.getAttribute('aria-invalid')).toBe('true');
    iban.value = 'gb82west12345698765432';
    iban.dispatchEvent(new Event('input', { bubbles: true }));
    iban.dispatchEvent(new FocusEvent('blur'));
    await tick();
    expect(last?.rib).toBe('GB82 WEST 1234 5698 7654 32');
    expect(iban.getAttribute('aria-invalid')).not.toBe('true');
  });

  test('a tax identifier follows its format', async () => {
    const input = [...el.querySelectorAll('input[inputmode="numeric"]')].pop() as HTMLInputElement;
    input.value = '12';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    input.value = '3201234567890';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    expect(input.getAttribute('aria-invalid')).not.toBe('true');
  });
});
