import { Component, Element, Event, Listen, Method, Prop, State, Watch, h } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';
import {
  expandSpec,
  getAffectedProperties,
  hasNestedForms,
  iterateBricks,
  validateBrickSpecDataDetailed,
} from '@streamline-pulse/formkrafter-core';
import type {
  BrickSpec,
  Utils,
  ValidationResult,
} from '@streamline-pulse/formkrafter-core';
import type { DataChangeDetail } from '../../utils/events';
import { fkT } from '../../i18n/i18n';
import { getBrickMolds } from '../../registry/registry';
import { registerDefaultBricks } from '../../registry/default-bricks';

@Component({
  tag: 'fk-form-render',
  styleUrl: 'fk-form-render.css',
  scoped: true,
})
export class FkFormRender {
  @Element() host!: HTMLElement;

  @Prop() spec!: BrickSpec;
  @Prop() data?: Record<string, unknown>;
  @Prop() editable: boolean = false;
  @Prop() selectedUid?: string;
  @Prop() locale?: string;

  @Event() formDataChange!: EventEmitter<DataChangeDetail>;
  @Event() formSubmit!: EventEmitter<DataChangeDetail>;

  @State() currentData: Record<string, unknown> = {};
  @State() touched: Record<string, boolean> = {};
  @State() expandedSpec?: BrickSpec;
  @State() expanding = false;
  @State() expandError?: string;

  componentWillLoad() {
    if (getBrickMolds().length === 0) registerDefaultBricks();
    this.currentData = { ...this.data };
    return this.runExpansion();
  }

  @Watch('data')
  syncData(next?: Record<string, unknown>) {
    this.currentData = { ...next };
  }

  @Watch('spec')
  onSpecChange() {
    void this.runExpansion();
  }

  private effectiveSpec(): BrickSpec {
    return this.expandedSpec ?? this.spec;
  }

  private async runExpansion(): Promise<void> {
    this.expandError = undefined;

    if (this.editable || !hasNestedForms(this.spec)) {
      this.expandedSpec = undefined;
      return;
    }

    const source = this.spec;
    this.expanding = true;

    try {
      const expanded = await expandSpec(source);
      if (this.spec === source) this.expandedSpec = expanded;
    } catch (error) {
      if (this.spec === source) {
        this.expandedSpec = undefined;
        this.expandError =
          error instanceof Error ? error.message : String(error);
      }
    } finally {
      if (this.spec === source) this.expanding = false;
    }
  }

  private publicData(): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(this.currentData).filter(([key]) => !key.startsWith('_'))
    );
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
      data: this.publicData(),
      isValid: valid,
      errors,
    });
  }

  private applyValueEffects(
    data: Record<string, unknown>
  ): Record<string, unknown> {
    let result = data;

    for (const { brick } of iterateBricks(this.effectiveSpec())) {
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
    for (const { brick } of iterateBricks(this.effectiveSpec())) {
      const key = brick.configs?.key;
      if (key) touched[key] = true;
    }
    this.touched = touched;

    const flat = this.runValidation();
    const errors = { ...flat.errors };
    let valid = flat.valid;

    const grids = Array.from(
      this.host.querySelectorAll('fk-data-grid')
    ) as Array<HTMLElement & { validateRows: () => Promise<ValidationResult> }>;

    for (const grid of grids) {
      const rowResult = await grid.validateRows();
      valid = valid && rowResult.valid;
      Object.assign(errors, rowResult.errors);
    }

    const result = { valid, errors };
    this.formDataChange.emit({
      data: this.publicData(),
      isValid: result.valid,
      errors: result.errors,
    });

    return result;
  }

  @Listen('stepTouch')
  handleStepTouch(event: CustomEvent<{ keys: string[] }>) {
    event.stopPropagation();

    const touched = { ...this.touched };
    for (const key of event.detail.keys) touched[key] = true;
    this.touched = touched;
  }

  @Listen('stepperSubmit')
  async handleStepperSubmit(event: CustomEvent<void>) {
    event.stopPropagation();

    const result = await this.validate();
    this.formSubmit.emit({
      data: this.publicData(),
      isValid: result.valid,
      errors: result.errors,
    });
  }

  private runValidation(): ValidationResult {
    const presentData = Object.fromEntries(
      Object.entries(this.currentData).filter(
        ([, value]) => value !== '' && value !== null && value !== undefined
      )
    );

    return validateBrickSpecDataDetailed(this.effectiveSpec(), presentData, this.locale);
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

    if (this.expanding) {
      return <p class="fk-form__expanding">{fkT('nestedForm.loading')}</p>;
    }

    return (
      <form class="fk-form" onSubmit={(event) => event.preventDefault()}>
        {this.expandError ? (
          <span class="fk-field__error" role="alert">
            {this.expandError}
          </span>
        ) : null}
        <fk-brick-render
          brickSpec={this.effectiveSpec()}
          rootSpec={this.effectiveSpec()}
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
