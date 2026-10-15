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
      name: 'Text',
      configs: { uid: 'n', key: 'name', label: 'Name' },
    },
    {
      type: 'input',
      dataType: 'string',
      id: 'email',
      name: 'Email',
      configs: { uid: 'e', key: 'email', label: 'Email' },
    },
    {
      type: 'input',
      dataType: 'boolean',
      id: 'checkbox',
      name: 'Checkbox',
      configs: { uid: 'c', key: 'agree', label: 'Agree' },
    },
    {
      type: 'input',
      dataType: 'string',
      id: 'radio',
      name: 'Radio',
      configs: { uid: 'r', key: 'kind', label: 'Kind', options: 'A\nB' },
    },
  ],
});

type ReviewEl = HTMLElement & {
  spec: unknown;
  data?: Record<string, unknown>;
  reviews?: Record<string, { incorrect?: boolean; comment?: string }>;
  notes?: Record<string, { incorrect?: boolean; comment?: string }>;
};
type RenderEl = HTMLElement & {
  spec: unknown;
  data?: Record<string, unknown>;
  annotations?: Record<string, { incorrect?: boolean; comment?: string }>;
  editableKeys?: string[];
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
  (await import('../dist/components/fk-form-review.js')).defineCustomElement();
});

const fieldOf = (root: HTMLElement, key: string): HTMLElement => {
  const control = root.querySelector(`[name="${key}"], input[type="radio"][name="${key}"]`);
  const field = control?.closest('.fk-field') ?? null;
  if (field) return field as HTMLElement;
  // Text inputs carry no name attribute: find the field by its label text.
  const labels = [...root.querySelectorAll('.fk-field')] as HTMLElement[];
  const match = labels.find((el) =>
    el.querySelector('.fk-field__label')?.textContent?.trim().startsWith(key.charAt(0).toUpperCase() + key.slice(1))
  );
  if (!match) throw new Error(`no field for ${key}`);
  return match;
};

describe('fk-form-review', () => {
  let el: ReviewEl;
  let last: { reviews: Record<string, unknown>; flagged: string[] } | undefined;

  beforeAll(async () => {
    el = document.createElement('fk-form-review') as ReviewEl;
    el.spec = spec();
    el.data = { name: 'Ada', email: 'ada@example.com', agree: true, kind: 'A' };
    el.reviews = { email: { incorrect: true, comment: 'Wrong domain' } };
    el.notes = { name: { incorrect: true, comment: 'Was misspelled last time' } };
    document.body.appendChild(el);
    el.addEventListener('reviewChange', (event) => {
      last = structuredClone((event as CustomEvent).detail);
    });
    await tick(150);
  });

  test('renders the data read-only with a flag control under every field', () => {
    const inputs = [...el.querySelectorAll('input.fk-field__input')] as HTMLInputElement[];
    expect(inputs.length).toBeGreaterThanOrEqual(2);
    expect(inputs.every((input) => input.hasAttribute('readonly'))).toBe(true);
    expect(el.querySelectorAll('.fk-review__flag').length).toBe(4);
  });

  test('shows the previous review as a reminder next to fresh controls', () => {
    const name = fieldOf(el, 'name');
    expect(name.querySelector('.fk-review--previous .fk-review__text')?.textContent).toBe('Was misspelled last time');
    expect(name.querySelector('.fk-review__flag input')).toBeTruthy();
    expect((name.querySelector('.fk-review__flag input') as HTMLInputElement).checked).toBe(false);
    expect(fieldOf(el, 'email').querySelector('.fk-review--previous')).toBeNull();
  });

  test('starts from the given reviews', () => {
    const email = fieldOf(el, 'email');
    expect(email.classList.contains('fk-field--flagged')).toBe(true);
    const comment = email.querySelector('.fk-review__comment') as HTMLTextAreaElement;
    expect(comment.value).toBe('Wrong domain');
    expect(fieldOf(el, 'name').querySelector('.fk-review__comment')).toBeNull();
  });

  test('flagging a field emits the review map and shows the comment box', async () => {
    const name = fieldOf(el, 'name');
    const flag = name.querySelector('.fk-review__flag input') as HTMLInputElement;
    flag.checked = true;
    flag.dispatchEvent(new Event('change', { bubbles: true }));
    await tick();
    expect(last?.reviews.name).toEqual({ incorrect: true });
    expect(last?.flagged.sort()).toEqual(['email', 'name']);

    const comment = fieldOf(el, 'name').querySelector('.fk-review__comment') as HTMLTextAreaElement;
    expect(comment).toBeTruthy();
    comment.value = 'Use the legal name';
    comment.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    expect(last?.reviews.name).toEqual({ incorrect: true, comment: 'Use the legal name' });
  });

  test('unflagging an uncommented field removes it from the map', async () => {
    const email = fieldOf(el, 'email');
    const flag = email.querySelector('.fk-review__flag input') as HTMLInputElement;
    flag.checked = false;
    flag.dispatchEvent(new Event('change', { bubbles: true }));
    await tick();
    expect(last?.reviews.email).toEqual({ incorrect: false, comment: 'Wrong domain' });
    expect(last?.flagged).toEqual(['name']);
  });
});

describe('fk-form-render with annotations and editableKeys', () => {
  let el: RenderEl;

  beforeAll(async () => {
    el = document.createElement('fk-form-render') as RenderEl;
    el.spec = spec();
    el.data = { name: 'Ada', email: 'ada@example.com' };
    el.annotations = { email: { incorrect: true, comment: 'Wrong domain' } };
    el.editableKeys = ['email'];
    document.body.appendChild(el);
    await tick(150);
  });

  test('shows the note under the annotated field only', () => {
    const email = fieldOf(el, 'email');
    expect(email.classList.contains('fk-field--flagged')).toBe(true);
    expect(email.querySelector('.fk-review__text')?.textContent).toBe('Wrong domain');
    expect(email.querySelector('.fk-review__badge')).toBeTruthy();
    expect(fieldOf(el, 'name').querySelector('.fk-review')).toBeNull();
    expect(el.querySelectorAll('.fk-review__flag').length).toBe(0);
  });

  test('locks every field outside editableKeys', () => {
    const name = fieldOf(el, 'name').querySelector('input') as HTMLInputElement;
    const email = fieldOf(el, 'email').querySelector('input') as HTMLInputElement;
    expect(name.hasAttribute('readonly')).toBe(true);
    expect(email.hasAttribute('readonly')).toBe(false);
    const radios = [...el.querySelectorAll('input[type="radio"]')] as HTMLInputElement[];
    expect(radios.every((radio) => radio.disabled)).toBe(true);
  });
});
