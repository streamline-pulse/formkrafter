import type {
  Brick,
  BrickBaseConfigs,
  BrickMold,
  BrickSpec,
  BrickType,
} from '@streamline-pulse/formkrafter-core';

export type AnyBrick = Brick<unknown, BrickBaseConfigs, Record<string, unknown>>;

const bricks = new Map<string, AnyBrick>();

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

  return {
    ...brick.getBrickEmptySpec(),
    configs: { uid: crypto.randomUUID() },
  };
}
