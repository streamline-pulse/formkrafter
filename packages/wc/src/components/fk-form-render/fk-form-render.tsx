import { Component, Event, Listen, Method, Prop, State, Watch, h } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';
import {
  getAffectedProperties,
  iterateBricks,
  validateBrickSpecDataDetailed,
} from '@streamline-pulse/formkrafter-core';
import type {
  BrickSpec,
  Utils,
  ValidationResult,
} from '@streamline-pulse/formkrafter-core';
import type { DataChangeDetail } from '../../utils/events';

@Component({
  tag: 'fk-form-render',
  styleUrl: 'fk-form-render.css',
  scoped: true,
})
export class FkFormRender {
  @Prop() spec!: BrickSpec;
  @Prop() data?: Record<string, unknown>;
  @Prop() editable: boolean = false;
  @Prop() selectedUid?: string;
  @Prop() locale?: string;

  @Event() formDataChange!: EventEmitter<DataChangeDetail>;

  @State() currentData: Record<string, unknown> = {};
  @State() touched: Record<string, boolean> = {};

  componentWillLoad() {
    this.currentData = { ...this.data };
  }

  @Watch('data')
  syncData(next?: Record<string, unknown>) {
    this.currentData = { ...next };
  }

  @Listen('brickDataChange')
  handleBrickDataChange(event: CustomEvent<Record<string, unknown>>) {
    event.stopPropagation();

    this.currentData = this.applyValueEffects({
      ...this.currentData,
      ...event.detail,
    });
    const touched = { ...this.touched };
    for (const key of Object.keys(event.detail)) touched[key] = true;
    this.touched = touched;

    const { valid, errors } = this.runValidation();
    this.formDataChange.emit({
      data: this.currentData,
      isValid: valid,
      errors,
    });
  }

  private applyValueEffects(
    data: Record<string, unknown>
  ): Record<string, unknown> {
    let result = data;

    for (const { brick } of iterateBricks(this.spec)) {
      const key = brick.configs?.key;
      if (!key || !brick.rules?.length) continue;

      const affected = getAffectedProperties(brick.rules, result);
      if (affected.value !== undefined && result[key] !== affected.value) {
        result = { ...result, [key]: affected.value };
      }
    }

    return result;
  }

  @Method()
  async validate(): Promise<ValidationResult> {
    const touched: Record<string, boolean> = {};
    for (const { brick } of iterateBricks(this.spec)) {
      const key = brick.configs?.key;
      if (key) touched[key] = true;
    }
    this.touched = touched;

    const result = this.runValidation();
    this.formDataChange.emit({
      data: this.currentData,
      isValid: result.valid,
      errors: result.errors,
    });

    return result;
  }

  private runValidation(): ValidationResult {
    const presentData = Object.fromEntries(
      Object.entries(this.currentData).filter(
        ([, value]) => value !== '' && value !== null && value !== undefined
      )
    );

    return validateBrickSpecDataDetailed(this.spec, presentData, this.locale);
  }

  private visibleErrors(): Record<string, string> {
    if (this.editable) return {};

    const errors: Record<string, string> = {};
    for (const [key, message] of Object.entries(this.runValidation().errors)) {
      if (this.touched[key]) errors[key] = message;
    }

    return errors;
  }

  private utils: Utils = {
    validateForm: () => ({
      isValid: this.runValidation().valid,
    }),
  };

  render() {
    if (!this.spec) return null;

    return (
      <form class="fk-form" onSubmit={(event) => event.preventDefault()}>
        <fk-brick-render
          brickSpec={this.spec}
          data={this.currentData}
          dataMap={this.currentData}
          errors={this.visibleErrors()}
          locale={this.locale}
          path="0"
          editable={this.editable}
          selectedUid={this.selectedUid}
          utils={this.utils}
        />
      </form>
    );
  }
}
