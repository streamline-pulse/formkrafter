import { beforeAll, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';

const tick = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

const spec = () => ({
  type: 'panel',
  id: 'column',
  name: 'Form',
  configs: { uid: 'root', key: 'form' },
  children: [
    {
      type: 'input', dataType: 'object', id: 'appointment', name: 'Appointment slot',
      configs: { uid: 'a', key: 'rdv', label: 'Rendez-vous', slotsUrl: 'https://slots.test/list', days: '1,2,3,4,5,6,7' },
    },
    { type: 'input', dataType: 'object', id: 'date-range', name: 'Date range', configs: { uid: 'r', key: 'periode', label: 'Période' } },
  ],
});

type RenderEl = HTMLElement & { spec: unknown; data?: Record<string, unknown> };

beforeAll(async () => {
  const window = new Window({ url: 'http://localhost/' });
  for (const key of [
    'document', 'HTMLElement', 'HTMLInputElement', 'HTMLButtonElement', 'Element', 'Node', 'customElements', 'CustomEvent',
    'Event', 'KeyboardEvent', 'MouseEvent', 'MutationObserver', 'requestAnimationFrame', 'cancelAnimationFrame',
    'getComputedStyle', 'navigator', 'location', 'CSSStyleSheet', 'ShadowRoot', 'DocumentFragment',
  ]) {
    const value = (window as unknown as Record<string, unknown>)[key];
    if (value !== undefined) (globalThis as Record<string, unknown>)[key] = value;
  }
  (globalThis as Record<string, unknown>).window = window;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        slots: [
          { id: 's1', start: '2030-01-07T09:00', end: '2030-01-07T09:30', remaining: 3 },
          { id: 's2', start: '2030-01-07T09:30', end: '2030-01-07T10:00', remaining: 0 },
          { id: 's3', start: '2030-01-08T14:00', end: '2030-01-08T14:30' },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )) as typeof fetch;
  (await import('../dist/components/fk-form-render.js')).defineCustomElement();
});

describe('time bricks', () => {
  let el: RenderEl;
  let last: Record<string, unknown> | undefined;

  beforeAll(async () => {
    el = document.createElement('fk-form-render') as RenderEl;
    el.spec = spec();
    document.body.appendChild(el);
    el.addEventListener('formDataChange', (event) => {
      last = (event as CustomEvent).detail?.data;
    });
    await tick(400);
  });

  test('slots from the provider are listed by day, full ones hidden, and a pick stores the slot', async () => {
    const days = [...el.querySelectorAll('.fk-slots__day')] as HTMLButtonElement[];
    expect(days.length).toBe(2);
    let times = [...el.querySelectorAll('.fk-slots__time')] as HTMLButtonElement[];
    expect(times.map((t) => t.textContent?.trim())).toEqual(['09:00 · 3']);
    days[1].click();
    await tick();
    times = [...el.querySelectorAll('.fk-slots__time')] as HTMLButtonElement[];
    expect(times.map((t) => t.textContent?.trim())).toEqual(['14:00']);
    times[0].click();
    await tick();
    expect(last?.rdv).toEqual({ id: 's3', start: '2030-01-08T14:00', end: '2030-01-08T14:30' });
    expect(el.querySelector('.fk-slots__time--picked')).toBeTruthy();
  });

  test('a date range keeps both bounds and flags an inverted one', async () => {
    const [from, to] = [...el.querySelectorAll('.fk-range input[type="date"]')] as HTMLInputElement[];
    from.value = '2030-02-10';
    from.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    to.value = '2030-02-01';
    to.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    expect(last?.periode).toEqual({ from: '2030-02-10', to: '2030-02-01' });
    expect(from.getAttribute('aria-invalid')).toBe('true');
    to.value = '2030-02-20';
    to.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    expect(last?.periode).toEqual({ from: '2030-02-10', to: '2030-02-20' });
    expect(from.getAttribute('aria-invalid')).not.toBe('true');
  });
});
