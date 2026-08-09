import { beforeAll, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';

const tick = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms));

const spec = () => ({
  type: 'panel',
  id: 'column',
  name: 'Form',
  configs: { uid: 'root', key: 'form' },
  children: [
    {
      type: 'input',
      dataType: 'string',
      id: 'text',
      name: 'Text',
      configs: { uid: 'f1', key: 'name', label: 'Name' },
    },
  ],
});

let renderEl: HTMLElement & { spec?: unknown };

/**
 * Registering a custom brick before mounting is the documented flow, and it
 * used to break every built-in: the components only registered the defaults
 * when the registry was empty, so one custom brick was enough to suppress all
 * 30 and render "Brick panel:column not found".
 */
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

  const { createBrick, registerBrick, h } = await import('../dist/components/index.js');

  // A custom brick lands in the registry before anything mounts.
  registerBrick(
    createBrick({
      type: 'input',
      dataType: 'number',
      id: 'rating',
      name: 'Rating',
      category: 'Inputs',
      render: () => h('div', { class: { 'fk-field': true } }, 'rating'),
    })
  );

  // And an application override of a BUILT-IN brick — a UI-kit skin, say.
  // The defaults must leave it alone.
  registerBrick(
    createBrick({
      type: 'input',
      dataType: 'string',
      id: 'signature',
      name: 'Custom signature',
      category: 'Inputs',
      render: () => h('div', { class: { 'fk-field': true } }, 'custom-signature'),
    })
  );

  const formRender = await import('../dist/components/fk-form-render.js');
  formRender.defineCustomElement();

  renderEl = document.createElement('fk-form-render') as typeof renderEl;
  renderEl.spec = spec();
  document.body.appendChild(renderEl);
  await tick();
});

describe('default brick registration', () => {
  test('built-ins still register when a custom brick was registered first', async () => {
    const { getBrickMolds } = await import('../dist/components/index.js');
    const ids = getBrickMolds().map((mold: { id: string }) => mold.id);

    expect(ids).toContain('rating');
    expect(ids).toContain('column');
    expect(ids).toContain('text');
    expect(ids.length).toBeGreaterThan(30);
  });

  test('the form renders instead of reporting a missing brick', () => {
    expect(renderEl.textContent).not.toContain('not found');
    expect(renderEl.querySelector('input')).toBeTruthy();
  });

  test('an override of a built-in brick survives the defaults', async () => {
    const { getBrick } = await import('../dist/components/index.js');
    expect(getBrick('input', 'signature')?.name).toBe('Custom signature');
  });
});
