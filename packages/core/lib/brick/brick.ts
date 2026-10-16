import type { Validator } from "../validators/validator.js";
import type { Validation } from "../validators/validation.js";
import type { JSONSchemaType } from "../validators/json-schema-type.js";
import { type Utils } from "./utils.js";
import type { Rule } from "../rules/rule.js";
import type { BrickSpec } from "../utils/brick-spec.js";
import type { BrickType } from "../utils/brick-type.js";
import type { BrickBaseConfigs, CommonBrickProps } from "../utils/common-brick-props.js";
import type { BrickMoldDropType } from "../utils/drop-type.js";
import type { FieldAnnotation } from "../review.js";

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
  /** Sets several form keys at once (a brick that fills other fields, e.g. from a document). */
  onDataPatch?: (patch: Record<string, unknown>) => void;
  onMove?: (from: string, to: string) => void;
  onDuplicate?: (path: string) => void;
  onDelete?: (path: string) => void;
  onAddBrick?: (brickMold: BrickMoldDropType, path: string) => void;
  path: string;
  error?: string;
  disabled?: boolean;
  readOnly?: boolean;
  /** A reviewer's note on this field, shown under the control. */
  annotation?: FieldAnnotation;
  /** An earlier review's verdict on this field, shown as a reminder in any mode. */
  note?: FieldAnnotation;
  /** Present in review mode: the controls to flag the field and comment it. */
  review?: { value: FieldAnnotation; onChange: (next: FieldAnnotation) => void };
  /** The whole maps, for composite bricks (data grid) that scope them per row. */
  annotations?: Record<string, FieldAnnotation>;
  notes?: Record<string, FieldAnnotation>;
  reviewable?: boolean;
  editableKeys?: string[];
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