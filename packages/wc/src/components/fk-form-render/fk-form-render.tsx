import {
  Component,
  Element,
  Event,
  Listen,
  Method,
  Prop,
  State,
  Watch,
  h,
} from '@stencil/core';
import type { EventEmitter } from '@stencil/core';
import {
  defaultFormData,
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
import type { DataChangeDetail, ValidityChangeDetail } from '../../utils/events';
import { fkT } from '../../i18n/i18n';
import { registerDefaultBricks } from '../../registry/default-bricks';

@Component({
  tag: 'fk-form-render',
  styleUrl: 'fk-form-render.css',
  scoped: true,
  formAssociated: true,
})
export class FkFormRender {
  @Element() host!: HTMLElement;

  @Prop() spec!: BrickSpec;
  @Prop() data?: Record<string, unknown>;
  @Prop() context?: Record<string, unknown>;
  @Prop() editable: boolean = false;
  @Prop() readOnly: boolean = false;
  @Prop() disabled: boolean = false;
  @Prop() showSubmit: boolean = false;
  @Prop() submitLabel?: string;
  @Prop() selectedPath?: string;
  @Prop() locale?: string;

  @Event() formDataChange!: EventEmitter<DataChangeDetail>;
  @Event() formSubmit!: EventEmitter<DataChangeDetail>;
  @Event() validityChange!: EventEmitter<ValidityChangeDetail>;

  @State() currentData: Record<string, unknown> = {};
  @State() touched: Record<string, boolean> = {};
  @State() expandedSpec?: BrickSpec;
  @State() expanding = false;
  @State() expandError?: string;

  private lastValidity?: string;

  private internals?: ElementInternals;

  componentWillLoad() {
    registerDefaultBricks();
    this.attachFormInternals();
    this.currentData = this.seeded(this.data);
    return this.runExpansion();
  }

  @Watch('data')
  syncData(next?: Record<string, unknown>) {
    this.currentData = this.seeded(next);
  }

  @Watch('spec')
  onSpecChange() {
    this.currentData = this.seeded(this.data);
    void this.runExpansion();
  }

  componentDidLoad() {
    this.emitValidity();
  }

  private emitValidity(result?: ValidationResult) {
    const { valid, errors } = result ?? this.runValidation();
    const signature = `${valid}|${Object.keys(errors).sort().join(',')}`;
    if (signature === this.lastValidity) return;

    this.lastValidity = signature;
    this.validityChange.emit({ valid, errors });
    this.reportToForm(valid, errors);
  }

  private attachFormInternals() {
    const host = this.host as HTMLElement & {
      attachInternals?: () => ElementInternals;
    };
    if (typeof host.attachInternals !== 'function') return;

    try {
      this.internals = host.attachInternals();
    } catch {
      this.internals = undefined;
    }
  }

  private reportToForm(valid: boolean, errors: Record<string, string>) {
    if (!this.internals?.setValidity) return;

    try {
      this.internals.setFormValue(JSON.stringify(this.publicData()));
      if (valid) {
        this.internals.setValidity({});
      } else {
        this.internals.setValidity(
          { customError: true },
          Object.values(errors)[0] ?? fkT('form.invalid'),
          this.host.querySelector('input, select, textarea') ?? undefined
        );
      }
    } catch {
      // ElementInternals is absent or partial: the element still works, it
      // just does not participate in the surrounding form.
    }
  }

  @Listen('submit', { target: 'window' })
  handleHostFormSubmit(event: Event) {
    const form = this.internals?.form;
    if (!form || event.target !== form) return;

    event.preventDefault();
    void this.submit();
  }

  private seeded(data?: Record<string, unknown>): Record<string, unknown> {
    return { ...defaultFormData(this.effectiveSpec()), ...data };
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
      if (this.spec === source) {
        this.expandedSpec = expanded;
        this.currentData = this.seeded(this.currentData);
      }
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

  private dataMap(
    data: Record<string, unknown> = this.currentData
  ): Record<string, unknown> {
    return this.context ? { ...data, ...this.context } : data;
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
    this.emitValidity({ valid, errors });
  }

  private applyValueEffects(
    data: Record<string, unknown>
  ): Record<string, unknown> {
    let result = data;

    for (const { brick } of iterateBricks(this.effectiveSpec())) {
      const key = brick.configs?.key;
      if (!key || !brick.rules?.length) continue;

      const affected = getAffectedProperties(brick.rules, this.dataMap(result));
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
    this.emitValidity(result);
    this.formDataChange.emit({
      data: this.publicData(),
      isValid: result.valid,
      errors: result.errors,
    });

    return result;
  }

  @Method()
  async submit(): Promise<ValidationResult> {
    const result = await this.validate();
    if (!result.valid || this.readOnly || this.disabled) return result;

    this.formSubmit.emit({
      data: this.publicData(),
      isValid: true,
      errors: {},
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
    await this.submit();
  }

  private runValidation(): ValidationResult {
    const presentData = Object.fromEntries(
      Object.entries(this.currentData).filter(
        ([, value]) => value !== '' && value !== null && value !== undefined
      )
    );

    return validateBrickSpecDataDetailed(
      this.effectiveSpec(),
      presentData,
      this.locale,
      this.context ? this.dataMap(presentData) : undefined
    );
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
          dataMap={this.dataMap()}
          errors={this.visibleErrors()}
          locale={this.locale}
          path="0"
          editable={this.editable}
          readOnly={this.readOnly}
          disabled={this.disabled}
          selectedPath={this.selectedPath}
          utils={this.utils}
        />
        {this.showSubmit && !this.editable && !this.readOnly && !this.disabled ? (
          <button
            type="submit"
            class="fk-form__submit"
            onClick={(event) => {
              event.preventDefault();
              void this.submit();
            }}
          >
            {this.submitLabel ?? fkT('form.submit')}
          </button>
        ) : null}
      </form>
    );
  }
}
