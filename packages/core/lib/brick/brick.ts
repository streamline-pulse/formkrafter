import type { Validator } from "../validators/validator";
import type { Validation } from "../validators/validation";
import type { JSONSchemaType } from "../validators/json-schema-type";
import { type Utils } from "./utils";
import type { Rule } from "../rules/rule";
import type { BrickSpec } from "../utils/brick-spec";
import type { BrickType } from "../utils/brick-type";
import type { BrickBaseConfigs, CommonBrickProps } from "../utils/common-brick-props";
import type { BrickMoldDropType } from "../utils/drop-type";

export interface BrickProps<DataType, Configs extends BrickBaseConfigs, Styles>
  extends CommonBrickProps<Configs, Styles> {
  onConfigsChange?: (
    configs: BrickBaseConfigs & Record<string, unknown>,
    path?: string
  ) => void;
  onStylesChange?: (
    styles: Record<string, unknown>,
    path?: string
  ) => void;
  data?: DataType;
  dataMap?: Record<string, unknown>;
  rootSpec?: BrickSpec;
  onDataChange?: (value?: DataType) => void;
  onMove?: (from: string, to: string) => void;
  onDuplicate?: (path: string) => void;
  onDelete?: (path: string) => void;
  onAddBrick?: (brickMold: BrickMoldDropType, path: string) => void;
  path: string;
  error?: string;
  disabled?: boolean;
  locale?: string;
  children?: unknown;
  brickSpec?: BrickSpec;
  editable?: boolean;
  validations?: Validation[];
  onValidationsChange?: (validations: Validation[], path?: string) => void;
  rules?: Rule[];
  onRulesChange?: (rules: Rule[], path?: string) => void;
  utils: Utils;
}

export abstract class Brick<
  DataType,
  Configs extends BrickBaseConfigs,
  Styles extends Record<string, unknown>> {
  readonly type: BrickType;
  readonly dataType: JSONSchemaType;
  readonly id: string;
  readonly name: string;
  readonly configsForm?: BrickSpec;
  readonly category?: string;
  readonly styles?: Styles;

  readonly unWrapData: boolean;
  readonly isPrivate: boolean;

  readonly validators: Validator[];
  readonly defaultConfigs?: Record<string, unknown>;

  constructor(params: {
    type: BrickType;
    dataType: JSONSchemaType;
    id: string;
    name: string;
    configsForm?: BrickSpec;
    category?: string;
    styles?: Styles;
    unWrapData?: boolean;
    isPrivate?: boolean;
    validators?: Validator[];
    defaultConfigs?: Record<string, unknown>;
  }) {
    this.type = params.type;
    this.dataType = params.dataType;
    this.id = params.id;
    this.name = params.name;
    this.configsForm = params.configsForm;
    this.category = params.category;
    this.styles = params.styles;
    this.unWrapData = params.unWrapData ?? false;
    this.isPrivate = params.isPrivate ?? false;
    this.validators = params.validators ?? [];
    this.defaultConfigs = params.defaultConfigs;
  }

  abstract render(props: BrickProps<DataType, Configs, Styles>): unknown;


  abstract renderBuilder(props: BrickProps<DataType, Configs, Styles>): unknown;

  abstract getComponent(props: BrickProps<DataType, Configs, Styles>): unknown;
  abstract getComponentWithActions(props: BrickProps<DataType, Configs, Styles>): unknown;

  getBrickEmptySpec(): BrickSpec {
    return {
      type: this.type,
      dataType: this.dataType,
      id: this.id,
      name: this.name,
      ...(this.category !== undefined ? { category: this.category } : {}),
      ...(this.configsForm !== undefined ? { configsForm: this.configsForm } : {}),
      ...(this.styles !== undefined ? { styles: this.styles } : {}),
      ...(this.defaultConfigs !== undefined
        ? { configs: { ...this.defaultConfigs } }
        : {}),
      validators: this.validators,
    };
  }
}