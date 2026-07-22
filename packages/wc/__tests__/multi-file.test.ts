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
      type: 'input',
      dataType: 'array',
      id: 'file',
      name: 'Documents',
      configs: {
        uid: 'f1',
        key: 'docs',
        label: 'Documents',
        multiple: true,
        accept: '.pdf',
      },
    },
  ],
});

const uploaded = (name: string) => ({
  name,
  type: 'application/pdf',
  size: 1234,
  url: `https://cdn.test/${name}`,
});

let renderEl: HTMLElement & {
  spec?: unknown;
  data?: Record<string, unknown>;
};
let lastEmitted: Record<string, unknown> | undefined;

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
  renderEl.data = { docs: [uploaded('a.pdf'), uploaded('b.pdf')] };
  document.body.appendChild(renderEl);
  renderEl.addEventListener('formDataChange', (event) => {
    lastEmitted = structuredClone(
      (event as CustomEvent<{ data: Record<string, unknown> }>).detail.data
    );
  });
  await tick();
});

describe('multi-file brick', () => {
  test('renders one card per file plus an add button', () => {
    const cards = renderEl.querySelectorAll('.fk-file__selected');
    expect(cards.length).toBe(2);
    expect(renderEl.textContent).toContain('a.pdf');
    expect(renderEl.textContent).toContain('b.pdf');

    const choose = renderEl.querySelector('.fk-file__choose');
    expect(choose).toBeTruthy();

    const native = renderEl.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    expect(native.multiple).toBe(true);
  });

  test('removing one file emits the remaining array', async () => {
    const removeButtons = renderEl.querySelectorAll('.fk-file__remove');
    (removeButtons[0] as HTMLButtonElement).click();
    await tick(120);

    expect(Array.isArray(lastEmitted?.docs)).toBe(true);
    const docs = lastEmitted?.docs as Array<{ name: string }>;
    expect(docs).toHaveLength(1);
    expect(docs[0].name).toBe('b.pdf');
  });
});
