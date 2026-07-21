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
      dataType: 'array',
      id: 'multi-select',
      name: 'Multi select',
      configs: {
        uid: 'ms',
        key: 'choices',
        label: 'Choices',
        optionsSource: 'static',
        options: 'Alpha\nBeta\nGamma',
      },
    },
  ],
});

let renderEl: HTMLElement & { spec?: unknown };
let lastData: Record<string, unknown> | undefined;

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

  const formRender = await import('../dist/components/fk-form-render.js');
  formRender.defineCustomElement();

  const builder = await import('../dist/components/fk-form-builder.js');
  builder.defineCustomElement();

  const bootstrap = document.createElement('fk-form-builder');
  document.body.appendChild(bootstrap);
  await tick();
  bootstrap.remove();

  renderEl = document.createElement('fk-form-render') as typeof renderEl;
  renderEl.spec = spec();
  document.body.appendChild(renderEl);
  renderEl.addEventListener('formDataChange', (event) => {
    lastData = structuredClone(
      (event as CustomEvent<{ data: Record<string, unknown> }>).detail.data
    );
  });
  await tick();
});

const options = () => [...renderEl.querySelectorAll('.fk-select__option')];
const chips = () =>
  [...renderEl.querySelectorAll('.fk-select__chip')].map((chip) =>
    (chip.textContent ?? '').replace('✕', '').trim()
  );

describe('fk-select-input (multiple)', () => {
  test('accumulates selections instead of resetting', async () => {
    (renderEl.querySelector('.fk-select__trigger') as HTMLElement).click();
    await tick();
    expect(options().length).toBe(3);

    (options()[0] as HTMLElement).click();
    await tick();
    expect(lastData).toEqual({ choices: ['Alpha'] });

    (options()[1] as HTMLElement).click();
    await tick();
    expect(lastData).toEqual({ choices: ['Alpha', 'Beta'] });
    expect(chips()).toEqual(['Alpha', 'Beta']);
  });

  test('search filters the options', async () => {
    const search = renderEl.querySelector(
      '.fk-select__search'
    ) as HTMLInputElement;
    search.value = 'gam';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();

    expect(options().map((option) => option.textContent?.trim())).toEqual([
      'Gamma',
    ]);

    search.value = '';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
  });

  test('removing a chip only removes that value', async () => {
    (
      renderEl.querySelector('.fk-select__chip-remove') as HTMLElement
    ).click();
    await tick();

    expect(lastData).toEqual({ choices: ['Beta'] });
    expect(chips()).toEqual(['Beta']);
  });
});
