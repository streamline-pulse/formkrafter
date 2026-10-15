import { beforeAll, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { collectFields, validateFormData } from '@streamline-pulse/formkrafter-core';
import type { BrickSpec } from '@streamline-pulse/formkrafter-core';

const tick = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

const spec = () => ({
  type: 'panel',
  id: 'column',
  name: 'Form',
  configs: { uid: 'root', key: 'form' },
  children: [
    {
      type: 'input', dataType: 'object', id: 'geo-point', name: 'Map point',
      configs: { uid: 'p', key: 'site', label: 'Site', zoom: 8 },
      validations: [{ validator: 'required' }],
    },
    {
      type: 'input', dataType: 'object', id: 'geo-area', name: 'Map area',
      configs: { uid: 'a', key: 'zone', label: 'Zone', shape: 'polygon' },
    },
  ],
});

type RenderEl = HTMLElement & { spec: unknown; data?: Record<string, unknown>; readOnly?: boolean };

beforeAll(async () => {
  const window = new Window({ url: 'http://localhost/' });
  for (const key of [
    'document', 'HTMLElement', 'HTMLInputElement', 'HTMLDivElement', 'Element', 'Node', 'customElements', 'CustomEvent',
    'Event', 'KeyboardEvent', 'MouseEvent', 'MutationObserver', 'ResizeObserver', 'requestAnimationFrame',
    'cancelAnimationFrame', 'getComputedStyle', 'navigator', 'location', 'CSSStyleSheet', 'ShadowRoot', 'DocumentFragment',
  ]) {
    const value = (window as unknown as Record<string, unknown>)[key];
    if (value !== undefined) (globalThis as Record<string, unknown>)[key] = value;
  }
  (globalThis as Record<string, unknown>).window = window;
  (await import('../dist/components/fk-form-render.js')).defineCustomElement();
});

describe('geo bricks', () => {
  test('the core sees them as object fields the catalog leaves alone', () => {
    const fields = collectFields(spec() as unknown as BrickSpec);
    expect(fields.map((f) => [f.key, f.brick, f.dataType])).toEqual([
      ['site', 'geo-point', 'object'],
      ['zone', 'geo-area', 'object'],
    ]);
    expect(validateFormData(spec() as unknown as BrickSpec, {}).valid).toBe(false);
    expect(
      validateFormData(spec() as unknown as BrickSpec, { site: { type: 'Point', coordinates: [2.39, 6.37] } }).valid
    ).toBe(true);
  });

  describe('rendered', () => {
    let el: RenderEl;
    let last: Record<string, unknown> | undefined;

    beforeAll(async () => {
      el = document.createElement('fk-form-render') as RenderEl;
      el.spec = spec();
      el.data = { site: { type: 'Point', coordinates: [2.39, 6.37] } };
      document.body.appendChild(el);
      el.addEventListener('formDataChange', (event) => {
        last = (event as CustomEvent).detail?.data;
      });
      await tick(250);
    });

    test('a point shows its latitude and longitude, an area its vertex count', () => {
      const maps = el.querySelectorAll('fk-geo-map');
      expect(maps.length).toBe(2);
      const inputs = [...maps[0].querySelectorAll('input[type="number"]')] as HTMLInputElement[];
      expect(inputs.map((input) => input.value)).toEqual(['6.37', '2.39']);
      expect(maps[1].querySelector('.fk-geo__summary')?.textContent?.trim().startsWith('0')).toBe(true);
    });

    test('typing coordinates emits a GeoJSON point, clearing them empties the field', async () => {
      const [lat, lng] = [...el.querySelectorAll('fk-geo-map input[type="number"]')] as HTMLInputElement[];
      lat.value = '7.1';
      lat.dispatchEvent(new Event('change', { bubbles: true }));
      await tick();
      expect(last?.site).toEqual({ type: 'Point', coordinates: [2.39, 7.1] });
      lng.value = '';
      lng.dispatchEvent(new Event('change', { bubbles: true }));
      await tick();
      expect(last?.site ?? undefined).toBeUndefined();
    });

    test('read-only locks the inputs and hides the actions', async () => {
      el.readOnly = true;
      await tick();
      const inputs = [...el.querySelectorAll('fk-geo-map input[type="number"]')] as HTMLInputElement[];
      expect(inputs.every((input) => input.hasAttribute('readonly'))).toBe(true);
      expect(el.querySelectorAll('.fk-geo__clear').length).toBe(0);
    });
  });
});
