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
      type: 'input', dataType: 'object', id: 'document', name: 'Document reading',
      configs: {
        uid: 'd', key: 'piece', label: 'Pièce', readUrl: 'https://reader.test/read', keepFile: false,
        fields: 'numero|Numéro\nnom|Nom\nexpire|Expire le',
        fills: 'numero=reference\nnom=demandeur',
      },
    },
    { type: 'input', dataType: 'string', id: 'text', name: 'Text', configs: { uid: 'r', key: 'reference', label: 'Référence' } },
    { type: 'input', dataType: 'string', id: 'text', name: 'Text', configs: { uid: 'n', key: 'demandeur', label: 'Demandeur' } },
  ],
});

type RenderEl = HTMLElement & { spec: unknown; data?: Record<string, unknown> };

const calls: { url: string; fields: string | null; file: string }[] = [];

beforeAll(async () => {
  const window = new Window({ url: 'http://localhost/' });
  for (const key of [
    'document', 'HTMLElement', 'HTMLInputElement', 'HTMLButtonElement', 'HTMLDetailsElement', 'Element', 'Node', 'customElements',
    'CustomEvent', 'Event', 'KeyboardEvent', 'MouseEvent', 'MutationObserver', 'requestAnimationFrame', 'cancelAnimationFrame',
    'getComputedStyle', 'navigator', 'location', 'CSSStyleSheet', 'ShadowRoot', 'DocumentFragment', 'File', 'FileList', 'DataTransfer',
  ]) {
    const value = (window as unknown as Record<string, unknown>)[key];
    if (value !== undefined) (globalThis as Record<string, unknown>)[key] = value;
  }
  (globalThis as Record<string, unknown>).window = window;
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    const body = init.body as FormData;
    calls.push({ url, fields: body.get('fields') as string | null, file: (body.get('file') as File).name });
    return new Response(JSON.stringify({ text: 'CARTE NATIONALE\nNom: DOSSOU\nNo: AB123', fields: { numero: 'AB123', nom: 'DOSSOU' }, pages: 1 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;
  (await import('../dist/components/fk-form-render.js')).defineCustomElement();
});

describe('document brick', () => {
  let el: RenderEl;
  let last: Record<string, unknown> | undefined;

  beforeAll(async () => {
    el = document.createElement('fk-form-render') as RenderEl;
    el.spec = spec();
    document.body.appendChild(el);
    el.addEventListener('formDataChange', (event) => {
      last = (event as CustomEvent).detail?.data;
    });
    await tick(300);
  });

  test('a picked document is sent to the reader with the wanted fields, then stored and used to fill the form', async () => {
    const input = el.querySelector('.fk-document__native') as HTMLInputElement;
    expect(input).toBeTruthy();
    const file = new File([new TextEncoder().encode('%PDF')], 'cni.pdf', { type: 'application/pdf' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await tick(400);
    expect(calls).toEqual([{ url: 'https://reader.test/read', fields: 'numero,nom,expire', file: 'cni.pdf' }]);
    const piece = last?.piece as Record<string, unknown>;
    expect(piece.name).toBe('cni.pdf');
    expect(piece.fields).toEqual({ numero: 'AB123', nom: 'DOSSOU', expire: null });
    expect(piece.text).toContain('DOSSOU');
    expect(last?.reference).toBe('AB123');
    expect(last?.demandeur).toBe('DOSSOU');
    const dts = [...el.querySelectorAll('.fk-document__field dt')].map((n) => n.textContent?.trim());
    expect(dts).toEqual(['Numéro', 'Nom', 'Expire le']);
  });

  test('a corrected field updates the stored reading and the filled form key', async () => {
    const inputs = [...el.querySelectorAll('.fk-document__input')] as HTMLInputElement[];
    inputs[0].value = 'AB124';
    inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    expect((last?.piece as { fields: Record<string, unknown> }).fields.numero).toBe('AB124');
    expect(last?.reference).toBe('AB124');
  });

  test('removing the document clears the value but keeps the filled fields', async () => {
    (el.querySelector('.fk-document__remove') as HTMLButtonElement).click();
    await tick();
    expect(last?.piece == null).toBe(true);
    expect(last?.reference).toBe('AB124');
    expect(el.querySelector('.fk-document__choose')).toBeTruthy();
  });
});
