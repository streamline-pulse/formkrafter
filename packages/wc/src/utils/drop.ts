import type { BrickType } from '@streamline-pulse/formkrafter-core';
import { getBrickMolds } from '../registry/registry';
import type { BrickDropDetail } from './events';

export function toBrickDropDetail(
  data: Record<string, unknown>,
  parentPath: string,
  index?: number
): BrickDropDetail | undefined {
  if (data.kind === 'new-brick') {
    const mold = getBrickMolds().find(
      (candidate) =>
        candidate.type === (data.moldType as BrickType) &&
        candidate.id === data.moldId
    );
    if (!mold) return undefined;

    return { source: 'new', mold, parentPath, index };
  }

  if (data.kind === 'move-brick') {
    return { source: 'move', from: data.path as string, parentPath, index };
  }

  return undefined;
}
