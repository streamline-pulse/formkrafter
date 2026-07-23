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
      id: 'select',
      name: 'Select',
      configs: {
        uid: 'prof',
        key: 'profession',
        label: 'Profession',
        optionsSource: 'catalog',
        optionsRef: 'professions',
      },
    },
  ],
});

let renderEl: HTMLElement & { spec?: unknown };
let fetchedRefs: string[];

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

  fetchedRefs = [];
  const { services } = await import('../../core/dist/index.js');
  services.optionSourceService = {
    fetchOptions: async (ref: string) => {
      fetchedRefs.push(ref);
      return ['Accompagnateur', 'Accoucheuse', 'Agronome'];
    },
  };

  const formRender = await import('../dist/components/fk-form-render.js');
  formRender.defineCustomElement();

  renderEl = document.createElement('fk-form-render') as typeof renderEl;
  renderEl.spec = spec();
  document.body.appendChild(renderEl);
  await tick();
});

describe('catalog options (optionsRef)', () => {
  test('resolves options through services.optionSourceService', async () => {
    (renderEl.querySelector('.fk-select__trigger') as HTMLElement).click();
    await tick();

    const labels = [...renderEl.querySelectorAll('.fk-select__option')].map(
      (option) => option.textContent?.trim()
    );
    expect(labels).toEqual(['Accompagnateur', 'Accoucheuse', 'Agronome']);
    expect(fetchedRefs).toEqual(['professions']);
  });

  test('selecting a catalog option emits its value', async () => {
    let data: Record<string, unknown> | undefined;
    renderEl.addEventListener('formDataChange', (event) => {
      data = (event as CustomEvent<{ data: Record<string, unknown> }>).detail
        .data;
    });

    (renderEl.querySelector('.fk-select__option') as HTMLElement).click();
    await tick();
    expect(data).toEqual({ profession: 'Accompagnateur' });
  });
});
