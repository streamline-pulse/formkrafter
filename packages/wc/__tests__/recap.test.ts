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
      dataType: 'string',
      id: 'text',
      name: 'Name',
      configs: { uid: 'a', key: 'name', label: 'Full name' },
    },
    {
      type: 'input',
      dataType: 'string',
      id: 'select',
      name: 'Role',
      configs: {
        uid: 'b',
        key: 'role',
        label: 'Role',
        optionsSource: 'static',
        options: [
          { label: 'Developer', value: 'dev' },
          { label: 'Designer', value: 'design' },
        ],
      },
    },
    {
      type: 'input',
      dataType: 'string',
      id: 'text',
      name: 'Secret',
      configs: { uid: 'c', key: 'secret', label: 'Hidden field' },
      rules: [
        {
          name: 'always hidden',
          type: 'jsonLogic',
          logic: true,
          effects: [
            { property: { target: 'hidden', type: 'boolean' }, boolean: true },
          ],
        },
      ],
    },
    {
      type: 'collection',
      dataType: 'array',
      id: 'data-grid',
      name: 'Contacts',
      configs: { uid: 'd', key: 'contacts', label: 'Contacts' },
      children: [
        {
          type: 'input',
          dataType: 'string',
          id: 'email',
          name: 'Email',
          configs: { uid: 'e', key: 'email', label: 'Email' },
        },
      ],
    },
    {
      type: 'output',
      dataType: 'void',
      id: 'recap',
      name: 'Recap',
      configs: { uid: 'f', key: 'recap', label: 'Summary' },
    },
  ],
});

let renderEl: HTMLElement & {
  spec?: unknown;
  data?: Record<string, unknown>;
};

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
  renderEl.data = {
    name: 'Ada',
    role: 'dev',
    secret: 'should not appear',
    contacts: [{ email: 'ada@lovelace.dev' }],
  };
  document.body.appendChild(renderEl);
  await tick();
});

describe('recap brick', () => {
  test('summarizes filled entries with labels and option labels', () => {
    const recap = renderEl.querySelector('.fk-recap');
    expect(recap).toBeTruthy();
    const text = recap!.textContent ?? '';

    expect(text).toContain('Summary');
    expect(text).toContain('Full name');
    expect(text).toContain('Ada');
    expect(text).toContain('Role');
    expect(text).toContain('Developer');
    expect(text).not.toContain('dev,');
  });

  test('excludes fields hidden by rules', () => {
    const text = renderEl.querySelector('.fk-recap')!.textContent ?? '';
    expect(text).not.toContain('should not appear');
    expect(text).not.toContain('Hidden field');
  });

  test('collections render as a table with one row per entry', () => {
    const recap = renderEl.querySelector('.fk-recap')!;
    expect(recap.querySelector('.fk-recap__section-title')?.textContent).toBe(
      'Contacts'
    );

    const table = recap.querySelector('.fk-recap__table')!;
    expect(table).toBeTruthy();
    const headers = [...table.querySelectorAll('th')].map((th) => th.textContent);
    expect(headers).toEqual(['#', 'Email']);

    const cells = [...table.querySelectorAll('tbody td')].map(
      (td) => td.textContent
    );
    expect(cells).toEqual(['1', 'ada@lovelace.dev']);
  });

  test('updates live when the form changes', async () => {
    const input = renderEl.querySelector('input[type="text"]') as HTMLInputElement;
    input.value = 'Grace';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();

    const text = renderEl.querySelector('.fk-recap')!.textContent ?? '';
    expect(text).toContain('Grace');
  });

  test('groupBySections turns labelled panels into titled sections', async () => {
    const sectioned = document.createElement('fk-form-render') as typeof renderEl;
    sectioned.spec = {
      type: 'panel',
      id: 'column',
      name: 'Form',
      configs: { uid: 'root2', key: 'form' },
      children: [
        {
          type: 'panel',
          id: 'group',
          name: 'Identity',
          configs: { uid: 'g1', key: 's1', label: 'Identité' },
          children: [
            {
              type: 'input',
              dataType: 'string',
              id: 'text',
              name: 'Name',
              configs: { uid: 'g1a', key: 'name', label: 'Nom' },
            },
          ],
        },
        {
          type: 'panel',
          id: 'group',
          name: 'Trip',
          configs: { uid: 'g2', key: 's2', label: 'Voyage' },
          children: [
            {
              type: 'input',
              dataType: 'string',
              id: 'text',
              name: 'City',
              configs: { uid: 'g2a', key: 'city', label: 'Ville' },
            },
          ],
        },
        {
          type: 'output',
          dataType: 'void',
          id: 'recap',
          name: 'Recap',
          configs: {
            uid: 'r2',
            key: 'recap',
            label: 'Résumé',
            groupBySections: true,
          },
        },
      ],
    };
    sectioned.data = { name: 'Ada', city: 'Lomé' };
    document.body.appendChild(sectioned);
    await tick();

    const recap = sectioned.querySelector('.fk-recap')!;
    const titles = [...recap.querySelectorAll('.fk-recap__group-title')].map(
      (node) => node.textContent
    );
    expect(titles).toEqual(['Identité', 'Voyage']);

    const lists = recap.querySelectorAll('.fk-recap__list');
    expect(lists.length).toBe(2);
    expect(lists[0].textContent).toContain('Ada');
    expect(lists[1].textContent).toContain('Lomé');

    sectioned.remove();
  });
});
