import type {
  Brick,
  BrickBaseConfigs,
  BrickMold,
  BrickSpec,
  BrickType,
} from '@streamline-pulse/formkrafter-core';

export type AnyBrick = Brick<unknown, BrickBaseConfigs, Record<string, unknown>>;

const GLOBAL_KEY = Symbol.for('formkrafter.wc.bricks');
const globalStore = globalThis as unknown as Record<
  symbol,
  Map<string, AnyBrick> | undefined
>;

const bricks: Map<string, AnyBrick> = (globalStore[GLOBAL_KEY] ??= new Map());

const keyOf = (type: BrickType, id: string) => `${type}:${id}`;

export function registerBrick(brick: AnyBrick): void {
  bricks.set(keyOf(brick.type, brick.id), brick);
}

export function registerBricks(list: AnyBrick[]): void {
  list.forEach(registerBrick);
}

export function getBrick(type: BrickType, id: string): AnyBrick | undefined {
  return bricks.get(keyOf(type, id));
}

export function getBrickMolds(): BrickMold[] {
  return [...bricks.values()]
    .filter((brick) => !brick.isPrivate)
    .map((brick) => ({
      type: brick.type,
      id: brick.id,
      name: brick.name,
      configsForm: brick.configsForm,
      category: brick.category,
      isPrivate: brick.isPrivate,
    }));
}

export function getBrickMoldsGroupedByCategory(): Record<string, BrickMold[]> {
  const grouped: Record<string, BrickMold[]> = {};

  for (const mold of getBrickMolds()) {
    const category = mold.category ?? 'Uncategorized';
    (grouped[category] ??= []).push(mold);
  }

  return grouped;
}

export function newBrickSpec(type: BrickType, id: string): BrickSpec | undefined {
  const brick = getBrick(type, id);
  if (!brick) return undefined;

  const empty = brick.getBrickEmptySpec();
  const uid = crypto.randomUUID();

  return {
    ...empty,
    configs: {
      ...empty.configs,
      uid,
      key: empty.configs?.key ?? `${id}_${uid.slice(0, 6)}`,
    },
  };
}
