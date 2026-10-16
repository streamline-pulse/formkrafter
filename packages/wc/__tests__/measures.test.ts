import { beforeAll, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';

const tick = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

const spec = () => ({
  type: 'panel',
  id: 'column',
  name: 'Form',
  configs: { uid: 'root', key: 'form' },
  children: [
    { type: 'input', dataType: 'object', id: 'measure', name: 'Measure', configs: { uid: 's', key: 'surface', label: 'Surface', family: 'area', units: 'ha, m2', unit: 'ha' } },
    { type: 'input', dataType: 'string', id: 'vehicle-plate', name: 'Vehicle plate', configs: { uid: 'p', key: 'plaque', label: 'Plaque', plateFormat: 'bj' }, validations: [{ validator: 'required' }] },
    { type: 'input', dataType: 'string', id: 'company-registry', name: 'Company registration', configs: { uid: 'r', key: 'rccm', label: 'RCCM', registryFormat: 'ohada-rccm' } },
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

describe('measure and registry bricks', () => {
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

  test('a measure keeps its unit and the base-unit equivalent, units limited by configuration', async () => {
    const input = el.querySelector('.fk-measure__value') as HTMLInputElement;
    const select = el.querySelector('.fk-measure__unit') as HTMLSelectElement;
    expect([...select.options].map((o) => o.value)).toEqual(['m2', 'ha']);
    expect(select.value).toBe('ha');
    input.value = '2.5';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    expect(last?.surface).toEqual({ value: 2.5, unit: 'ha', base: 25000 });
    select.value = 'm2';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await tick();
    expect(last?.surface).toEqual({ value: 2.5, unit: 'm2', base: 2.5 });
  });

  test('a plate is upper-cased while typing, formatted on blur and checked against its format', async () => {
    const input = el.querySelector('.fk-plate') as HTMLInputElement;
    input.value = 'ab1234rb';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    expect(last?.plaque).toBe('AB1234RB');
    expect(input.getAttribute('aria-invalid')).not.toBe('true');
    input.dispatchEvent(new Event('blur', { bubbles: true }));
    await tick();
    expect(last?.plaque).toBe('AB 1234 RB');
    input.value = '12';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  test('a company registration follows the OHADA RCCM format', async () => {
    const input = el.querySelector('.fk-registry') as HTMLInputElement;
    input.value = 'rb/cot/01 b 1234';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    expect(last?.rccm).toBe('RB/COT/01 B 1234');
    expect(input.getAttribute('aria-invalid')).not.toBe('true');
    input.value = 'COT/1234';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });
});
