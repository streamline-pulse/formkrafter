import type { BrickBaseConfigs, CommonBrickProps } from "../utils/common-brick-props";
import type { BrickSpec } from "../utils/brick-spec";
import type { CollectionUtils, InputUtils, PanelUtils } from "./utils";

interface BrickProps<Configs extends BrickBaseConfigs, Styles>
  extends CommonBrickProps<Configs, Styles> {
  path: string;
  error?: string;
  editable?: boolean;
}

export interface PanelBrickProps<Configs extends BrickBaseConfigs, Styles>
  extends BrickProps<Configs, Styles> {
  children?: unknown;
  utils: PanelUtils;
}

export interface InputBrickProps<
  DataType,
  Configs extends BrickBaseConfigs,
  Styles
> extends BrickProps<Configs, Styles> {
  data?: DataType;
  onDataChange?: (value?: DataType) => void;
  utils: InputUtils;
}

export interface CollectionBrickProps<
  DataType,
  Configs extends BrickBaseConfigs,
  Styles
> extends BrickProps<Configs, Styles> {
  brickSpec?: BrickSpec;
  children?: unknown;
  data?: DataType;
  onDataChange?: (value?: DataType) => void;
  utils: CollectionUtils;
}
