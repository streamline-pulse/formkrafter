import { beforeAll, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';

const tick = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

const spec = () => ({
  type: 'panel',
  id: 'column',
  name: 'Form',
  configs: { uid: 'root', key: 'form' },
  children: [
    {
      type: 'input', dataType: 'object', id: 'geo-address', name: 'Address search',
      configs: { uid: 'a', key: 'adresse', label: 'Adresse', showMap: false, searchUrl: 'https://geo.test/search?q={q}' },
    },
  ],
});

type RenderEl = HTMLElement & { spec: unknown; data?: Record<string, unknown> };

const nominatim = [
  {
    place_id: 42,
    lat: '6.3703',
    lon: '2.3912',
    display_name: 'Boulevard de la Marina, Cotonou, Littoral, Bénin',
    address: { road: 'Boulevard de la Marina', city: 'Cotonou', postcode: '01', country: 'Bénin', country_code: 'bj' },
  },
  { place_id: 43, lat: '6.5', lon: '2.6', display_name: 'Marina, Porto-Novo, Bénin', address: { town: 'Porto-Novo', country: 'Bénin', country_code: 'bj' } },
];
const requested: string[] = [];

beforeAll(async () => {
  const window = new Window({ url: 'http://localhost/' });
  for (const key of [
    'document', 'HTMLElement', 'HTMLInputElement', 'Element', 'Node', 'customElements', 'CustomEvent', 'Event',
    'KeyboardEvent', 'MouseEvent', 'FocusEvent', 'MutationObserver', 'ResizeObserver', 'requestAnimationFrame',
    'cancelAnimationFrame', 'getComputedStyle', 'navigator', 'location', 'CSSStyleSheet', 'ShadowRoot', 'DocumentFragment',
  ]) {
    const value = (window as unknown as Record<string, unknown>)[key];
    if (value !== undefined) (globalThis as Record<string, unknown>)[key] = value;
  }
  (globalThis as Record<string, unknown>).window = window;
  globalThis.fetch = (async (url: string | URL) => {
    requested.push(String(url));
    return new Response(JSON.stringify(nominatim), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  (await import('../dist/components/fk-form-render.js')).defineCustomElement();
});

describe('geo-address brick', () => {
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

  test('typing queries the configured provider after a pause and lists the matches', async () => {
    const input = el.querySelector('fk-address-search input') as HTMLInputElement;
    input.dispatchEvent(new FocusEvent('focus'));
    input.value = 'Marina';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    // Text alone is already a value, without geometry.
    expect(last?.adresse).toEqual({ type: 'Feature', geometry: null, properties: { label: 'Marina' } });
    expect(requested.length).toBe(0);
    await tick(500);
    expect(requested[0]).toBe('https://geo.test/search?q=Marina');
    const items = [...el.querySelectorAll('.fk-address__item')] as HTMLElement[];
    expect(items.map((item) => item.textContent)).toEqual([
      'Boulevard de la Marina, Cotonou, Littoral, Bénin',
      'Marina, Porto-Novo, Bénin',
    ]);
  });

  test('picking a match stores the normalised address with its point', async () => {
    const items = [...el.querySelectorAll('.fk-address__item')] as HTMLElement[];
    items[0].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    await tick();
    expect(last?.adresse).toEqual({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [2.3912, 6.3703] },
      properties: {
        label: 'Boulevard de la Marina, Cotonou, Littoral, Bénin',
        street: 'Boulevard de la Marina',
        city: 'Cotonou',
        postcode: '01',
        country: 'Bénin',
        countryCode: 'bj',
        placeId: '42',
      },
    });
    const input = el.querySelector('fk-address-search input') as HTMLInputElement;
    expect(input.value).toBe('Boulevard de la Marina, Cotonou, Littoral, Bénin');
    expect(el.querySelectorAll('.fk-address__item').length).toBe(0);
    expect(el.querySelector('.fk-address__status--located')).toBeTruthy();
  });

  test('clearing the text empties the field', async () => {
    const input = el.querySelector('fk-address-search input') as HTMLInputElement;
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    expect(last?.adresse ?? undefined).toBeUndefined();
  });
});
