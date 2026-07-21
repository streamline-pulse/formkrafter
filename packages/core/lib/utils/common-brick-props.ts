import type { BrickSpec } from "./brick-spec";


export interface BrickBaseConfigs {
  uid?: string;
  key?: string;
}

export interface CommonBrickProps<
  Configs extends BrickBaseConfigs,
  Styles
> {
  configsForm?: BrickSpec;
  configs?: Configs;
  styles: Styles;
}

export type WithBrickBaseConfigs<T = object> = T & { uid?: string, key: string };
