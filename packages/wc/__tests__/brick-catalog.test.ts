import { beforeAll, describe, expect, test } from 'bun:test';
import { AI_EXCLUDED_BRICKS, BRICK_CATALOG } from '@streamline-pulse/formkrafter-core';

type Registered = { type: string; dataType: unknown; id: string; defaultConfigs?: Record<string, unknown> };

let registered: Registered[] = [];

// The strict schema a model writes against is generated from the core's brick
// catalog. A brick added here must be put in the catalog or excluded on purpose,
// and a catalog brick must still match what is registered. The defaults are read
// in a process of their own: other test files register bricks of their own in
// the same global registry.
const READ_DEFAULTS = `
  import { Window } from 'happy-dom';
  const window = new Window({ url: 'http://localhost/' });
  for (const key of ['document', 'HTMLElement', 'Element', 'Node', 'customElements', 'CustomEvent', 'Event', 'MutationObserver']) {
    if (window[key] !== undefined) globalThis[key] = window[key];
  }
  globalThis.window = window;
  const { registerDefaultBricks, getBrickMolds, getBrick } = await import('${new URL('../dist/components/index.js', import.meta.url).href}');
  registerDefaultBricks();
  const bricks = getBrickMolds().map((mold) => getBrick(mold.type, mold.id));
  console.log(JSON.stringify(bricks.map(({ type, dataType, id, defaultConfigs }) => ({ type, dataType, id, defaultConfigs }))));
`;

beforeAll(() => {
  const run = Bun.spawnSync(['bun', '--eval', READ_DEFAULTS], { cwd: import.meta.dir });
  if (run.exitCode !== 0) throw new Error(run.stderr.toString());
  registered = JSON.parse(run.stdout.toString().trim().split('\n').at(-1) ?? '[]');
});

describe('brick catalog (AI profile)', () => {
  test('every registered brick is in the catalog or excluded with a reason', () => {
    expect(registered.length).toBe(BRICK_CATALOG.length + Object.keys(AI_EXCLUDED_BRICKS).length);
    const undecided = registered
      .map((brick) => brick.id)
      .filter((id) => !BRICK_CATALOG.some((entry) => entry.id === id) && !(id in AI_EXCLUDED_BRICKS));
    expect(undecided).toEqual([]);
    expect(BRICK_CATALOG.filter((entry) => entry.id in AI_EXCLUDED_BRICKS)).toEqual([]);
  });

  test('every catalog brick is registered with the same type and data type', () => {
    for (const entry of BRICK_CATALOG) {
      const brick = registered.find((candidate) => candidate.id === entry.id);
      expect(brick, entry.id).toBeDefined();
      expect([brick!.type, brick!.dataType], entry.id).toEqual([entry.type, entry.dataType]);
    }
  });

  test("a catalog brick's default configs are all declared", () => {
    // optionsSource is set by fromStrictSpec: a model only writes static options.
    const common = ['key', 'label', 'description', 'defaultValue', 'optionsSource'];
    for (const entry of BRICK_CATALOG) {
      const defaults = Object.keys(registered.find((brick) => brick.id === entry.id)?.defaultConfigs ?? {});
      expect(defaults.filter((key) => !common.includes(key) && !(key in entry.configs)), entry.id).toEqual([]);
    }
  });
});
