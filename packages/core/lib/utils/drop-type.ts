import type { BrickMold } from './brick-mold';

export type BrickMoldDropType = {
  type: 'BrickMold';
  brickMold: BrickMold;
};

export type BrickSpecDropType = {
  type: 'BrickSpec';
  path: string;
};

export type DropType = BrickMoldDropType | BrickSpecDropType;
