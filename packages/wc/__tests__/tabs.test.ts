import { beforeAll, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';

const tick = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms));

const spec = () => ({
  type: 'panel',
  id: 'column',
  name: 'Form',
  configs: { uid: 'root', key: 'form' },
  children: [
    {
      type: 'panel',
      id: 'tabs',
      name: 'Tabs',
      configs: { uid: 't', key: 'tabs', validateTabs: true },
      children: [
        {
          type: 'panel',
          id: 'group',
          name: 'Main',
          configs: { uid: 'g1', key: 'g1', label: 'Main' },
          children: [
            {
              type: 'input',
              dataType: 'string',
              id: 'text',
              name: 'Name',
              configs: { uid: 'f1', key: 'name', label: 'Name' },
              validations: [{ validator: 'required' }],
            },
          ],
        },
        {
          type: 'panel',
          id: 'group',
          name: 'Extra',
          configs: { uid: 'g2', key: 'g2', label: 'Extra' },
          children: [
            {
              type: 'input',
              dataType: 'string',
              id: 'text',
              name: 'Note',
              configs: { uid: 'f2', key: 'note', label: 'Note' },
            },
          ],
        },
      ],
    },
  ],
});

let renderEl: HTMLElement & { spec?: unknown };

beforeAll(async () => {
  const window = new Window({ url: 'http://localhost/' });
  for (const key of [
    'document',
    'HTMLElement',
    'Element',
    'Node',
    'customElements',
    'CustomEvent',
    'Event',
    'MutationObserver',
    'requestAnimationFrame',
    'cancelAnimationFrame',
    'getComputedStyle',
    'navigator',
    'location',
    'CSSStyleSheet',
    'ShadowRoot',
    'DocumentFragment',
    'KeyboardEvent',
    'MouseEvent',
  ]) {
    const value = (window as unknown as Record<string, unknown>)[key];
    if (value !== undefined) {
      (globalThis as Record<string, unknown>)[key] = value;
    }
  }
  (globalThis as Record<string, unknown>).window = window;

  (await import('../dist/components/fk-form-render.js')).defineCustomElement();
  (await import('../dist/components/fk-form-builder.js')).defineCustomElement();

  const bootstrap = document.createElement('fk-form-builder');
  document.body.appendChild(bootstrap);
  await tick();
  bootstrap.remove();

  renderEl = document.createElement('fk-form-render') as typeof renderEl;
  renderEl.spec = spec();
  document.body.appendChild(renderEl);
  await tick();
});

const tabs = () => [...renderEl.querySelectorAll('.fk-tabs__tab')];
const activeIndex = () =>
  tabs().findIndex((tab) => tab.className.includes('fk-tabs__tab--active'));

describe('fk-tabs validateTabs', () => {
  test('leaving an invalid tab is blocked and shows errors', async () => {
    expect(activeIndex()).toBe(0);

    (tabs()[1] as HTMLElement).click();
    await tick();

    expect(activeIndex()).toBe(0);
    expect(renderEl.querySelector('.fk-field__error')?.textContent).toBe(
      'This field is required'
    );
  });

  test('a valid tab can be left freely', async () => {
    const input = renderEl.querySelector('input[type="text"]') as HTMLInputElement;
    input.value = 'Ada';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();

    (tabs()[1] as HTMLElement).click();
    await tick();
    expect(activeIndex()).toBe(1);

    (tabs()[0] as HTMLElement).click();
    await tick();
    expect(activeIndex()).toBe(0);
  });
});
