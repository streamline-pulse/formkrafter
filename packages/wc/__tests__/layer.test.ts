import { beforeAll, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';

const tick = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

const square = (x: number, y: number) => ({
  type: 'Polygon',
  coordinates: [[[x, y], [x + 0.1, y], [x + 0.1, y + 0.1], [x, y + 0.1], [x, y]]],
});

const communes = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', geometry: square(2.3, 6.3), properties: { insee: 'COT', nom: 'Cotonou' } },
    { type: 'Feature', geometry: square(2.4, 6.3), properties: { insee: 'PNV', nom: 'Porto-Novo' } },
    { type: 'Feature', geometry: square(2.5, 6.3), properties: { insee: 'ABC', nom: 'Abomey-Calavi' } },
    { type: 'Feature', geometry: square(2.6, 6.3), properties: { nom: 'Sans code' } },
  ],
};

const spec = (multiple: boolean) => ({
  type: 'panel',
  id: 'column',
  name: 'Form',
  configs: { uid: 'root', key: 'form' },
  children: [
    {
      type: 'input', dataType: 'object', id: 'geo-layer', name: 'Zone on a layer',
      configs: { uid: 'z', key: 'commune', label: 'Commune', layerUrl: 'https://geo.test/communes.geojson', codeProperty: 'insee', nameProperty: 'nom', multiple },
    },
  ],
});

type RenderEl = HTMLElement & { spec: unknown; data?: Record<string, unknown> };
const requested: string[] = [];

beforeAll(async () => {
  const window = new Window({ url: 'http://localhost/' });
  for (const key of [
    'document', 'HTMLElement', 'HTMLInputElement', 'HTMLSelectElement', 'Element', 'Node', 'customElements', 'CustomEvent',
    'Event', 'KeyboardEvent', 'MouseEvent', 'MutationObserver', 'ResizeObserver', 'requestAnimationFrame', 'cancelAnimationFrame',
    'getComputedStyle', 'navigator', 'location', 'CSSStyleSheet', 'ShadowRoot', 'DocumentFragment',
  ]) {
    const value = (window as unknown as Record<string, unknown>)[key];
    if (value !== undefined) (globalThis as Record<string, unknown>)[key] = value;
  }
  (globalThis as Record<string, unknown>).window = window;
  globalThis.fetch = (async (url: string | URL) => {
    requested.push(String(url));
    return new Response(JSON.stringify(communes), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  (await import('../dist/components/fk-form-render.js')).defineCustomElement();
});

describe('geo-layer brick', () => {
  test('lists the layer zones by name, skipping features without a code, and stores the pick', async () => {
    const el = document.createElement('fk-form-render') as RenderEl;
    el.spec = spec(false);
    el.data = { commune: { code: 'PNV', name: 'Porto-Novo' } };
    document.body.appendChild(el);
    let last: Record<string, unknown> | undefined;
    el.addEventListener('formDataChange', (event) => {
      last = (event as CustomEvent).detail?.data;
    });
    await tick(400);

    expect(requested).toEqual(['https://geo.test/communes.geojson']);
    const select = el.querySelector('select.fk-geo__select') as HTMLSelectElement;
    const options = [...select.querySelectorAll('option')] as HTMLOptionElement[];
    expect(options.map((option) => option.value)).toEqual(['', 'ABC', 'COT', 'PNV']);
    expect(options.map((option) => option.textContent)).toEqual(['Choose a zone…', 'Abomey-Calavi', 'Cotonou', 'Porto-Novo']);
    expect(options.find((option) => option.value === 'PNV')?.selected).toBe(true);

    select.value = 'COT';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await tick();
    expect(last?.commune).toEqual({ code: 'COT', name: 'Cotonou' });

    select.value = '';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await tick();
    expect(last?.commune ?? undefined).toBeUndefined();
    el.remove();
  });

  test('multiple keeps an array and the layer is fetched once per page', async () => {
    const el = document.createElement('fk-form-render') as RenderEl;
    el.spec = spec(true);
    el.data = { commune: [{ code: 'COT', name: 'Cotonou' }, { code: 'ABC', name: 'Abomey-Calavi' }] };
    document.body.appendChild(el);
    await tick(400);
    expect(requested.length).toBe(1);
    const chips = [...el.querySelectorAll('.fk-geo__chip')] as HTMLElement[];
    expect(chips.map((chip) => chip.textContent?.replace('×', '').trim())).toEqual(['Cotonou', 'Abomey-Calavi']);
    let last: Record<string, unknown> | undefined;
    el.addEventListener('formDataChange', (event) => {
      last = (event as CustomEvent).detail?.data;
    });
    (chips[0].querySelector('button') as HTMLButtonElement).click();
    await tick();
    expect(last?.commune).toEqual([{ code: 'ABC', name: 'Abomey-Calavi' }]);
    el.remove();
  });
});
