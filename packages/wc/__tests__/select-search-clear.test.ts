import { beforeAll, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';

const tick = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms));

const EIGHT = 'One\nTwo\nThree\nFour\nFive\nSix\nSeven\nEight';

const select = (key: string, configs: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
  type: 'input',
  dataType: 'string',
  id: 'select',
  name: key,
  configs: { key, label: key, optionsSource: 'static', options: 'Lead\nPartner\nCustomer', ...configs },
  ...extra,
});

const required = { validations: [{ validator: 'required' }] };

const spec = () => ({
  type: 'panel',
  id: 'column',
  name: 'Form',
  configs: { uid: 'root', key: 'form' },
  children: [
    select('short', {}),
    select('long', { options: EIGHT }),
    select('forcedOn', { searchable: true }),
    select('forcedOff', { options: EIGHT, searchable: false }),
    select('optional', {}),
    select('mandatory', {}, required),
    select('mandatoryClearable', { clearable: true }, required),
    select('optionalNotClearable', { clearable: false }),
  ],
});

type RenderEl = HTMLElement & { spec: unknown; data?: Record<string, unknown> };

let el: RenderEl;
let lastData: Record<string, unknown> | undefined;

const hostOf = (key: string): HTMLElement =>
  Array.from(el.querySelectorAll<HTMLElement>('fk-brick-render')).find(
    (host) => (host as unknown as { brickSpec?: { configs?: { key?: string } } }).brickSpec?.configs?.key === key
  )!;

const trigger = (key: string) => hostOf(key).querySelector('.fk-select__trigger') as HTMLElement;

const keydown = (target: Element, key: string) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

const openAndCheckSearch = async (key: string): Promise<boolean> => {
  trigger(key).click();
  await tick();
  const searchable = hostOf(key).querySelector('.fk-select__search') !== null;
  keydown(trigger(key), 'Escape');
  if (searchable) keydown(hostOf(key).querySelector('.fk-select__search')!, 'Escape');
  await tick();
  return searchable;
};

beforeAll(async () => {
  const window = new Window({ url: 'http://localhost/' });
  for (const key of [
    'document', 'HTMLElement', 'HTMLInputElement', 'Element', 'Node', 'customElements', 'CustomEvent',
    'Event', 'KeyboardEvent', 'MouseEvent', 'MutationObserver', 'requestAnimationFrame', 'cancelAnimationFrame',
    'getComputedStyle', 'navigator', 'location', 'CSSStyleSheet', 'ShadowRoot', 'DocumentFragment',
  ]) {
    const value = (window as unknown as Record<string, unknown>)[key];
    if (value !== undefined) (globalThis as Record<string, unknown>)[key] = value;
  }
  (globalThis as Record<string, unknown>).window = window;
  (await import('../dist/components/fk-form-render.js')).defineCustomElement();

  el = document.createElement('fk-form-render') as RenderEl;
  el.data = {
    short: 'Lead',
    optional: 'Lead',
    mandatory: 'Lead',
    mandatoryClearable: 'Lead',
    optionalNotClearable: 'Lead',
  };
  el.spec = spec();
  el.addEventListener('formDataChange', (event) => {
    lastData = structuredClone((event as CustomEvent<{ data: Record<string, unknown> }>).detail.data);
  });
  document.body.appendChild(el);
  await tick(250);
});

describe('configs.searchable', () => {
  test('"auto" shows the search box only above 7 options', async () => {
    expect(await openAndCheckSearch('short')).toBe(false);
    expect(await openAndCheckSearch('long')).toBe(true);
  });

  test('true and false force it either way', async () => {
    expect(await openAndCheckSearch('forcedOn')).toBe(true);
    expect(await openAndCheckSearch('forcedOff')).toBe(false);
  });

  test('without a search box the trigger drives the list from the keyboard', async () => {
    const box = trigger('short');
    keydown(box, 'ArrowDown');
    await tick();
    expect(box.getAttribute('aria-expanded')).toBe('true');

    const options = () => hostOf('short').querySelectorAll('[role="option"]');
    // The list opens on the current value.
    expect(box.getAttribute('aria-activedescendant')).toBe(options()[0].id);

    keydown(box, 'ArrowDown');
    await tick();
    expect(box.getAttribute('aria-activedescendant')).toBe(options()[1].id);

    // A letter moves to the next option that starts with it.
    keydown(box, 'c');
    await tick();
    expect(box.getAttribute('aria-activedescendant')).toBe(options()[2].id);

    keydown(box, 'Enter');
    await tick();
    expect(lastData?.short).toBe('Customer');
    expect(box.getAttribute('aria-expanded')).toBe('false');
    expect(box.hasAttribute('aria-activedescendant')).toBe(false);
  });

  test('Space picks and Escape closes without a search box', async () => {
    const box = trigger('short');
    keydown(box, 'ArrowDown');
    await tick();
    keydown(box, 'ArrowUp');
    await tick();
    keydown(box, ' ');
    await tick();
    expect(lastData?.short).toBe('Partner');

    keydown(box, 'ArrowDown');
    await tick();
    keydown(box, 'Escape');
    await tick();
    expect(box.getAttribute('aria-expanded')).toBe('false');
    expect(lastData?.short).toBe('Partner');
  });
});

describe('configs.clearable', () => {
  const clear = (key: string) => hostOf(key).querySelector('.fk-select__clear');

  test('an optional select can be cleared, a required one cannot by default', () => {
    expect(clear('optional')).not.toBeNull();
    expect(clear('mandatory')).toBeNull();
    expect(trigger('mandatory').getAttribute('aria-required')).toBe('true');
  });

  test('clearable overrides the default either way', () => {
    expect(clear('mandatoryClearable')).not.toBeNull();
    expect(clear('optionalNotClearable')).toBeNull();
  });
});
