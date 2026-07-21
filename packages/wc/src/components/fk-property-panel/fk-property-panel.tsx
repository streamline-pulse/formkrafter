import { Component, Event, Prop, h } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';
import type { BrickSpec, Validation } from '@streamline-pulse/formkrafter-core';
import type {
  BrickConfigsChangeDetail,
  BrickValidationsChangeDetail,
} from '../../utils/events';

@Component({
  tag: 'fk-property-panel',
  styleUrl: 'fk-property-panel.css',
  scoped: true,
})
export class FkPropertyPanel {
  @Prop() brick!: BrickSpec;

  @Event() brickConfigsChange!: EventEmitter<BrickConfigsChangeDetail>;
  @Event() brickValidationsChange!: EventEmitter<BrickValidationsChangeDetail>;

  private emitConfigs(patch: Record<string, unknown>) {
    const uid = this.brick.configs?.uid;
    if (!uid) return;

    this.brickConfigsChange.emit({ configs: patch, uid });
  }

  private emitValidations(validations: Validation[]) {
    const uid = this.brick.configs?.uid;
    if (!uid) return;

    this.brickValidationsChange.emit({ validations, uid });
  }

  private requiredValidation(): Validation | undefined {
    return this.brick.validations?.find(
      (validation) => validation.validator === 'required'
    );
  }

  private otherValidations(): Validation[] {
    return (this.brick.validations ?? []).filter(
      (validation) => validation.validator !== 'required'
    );
  }

  private setRequired(checked: boolean) {
    const current = this.requiredValidation();
    this.emitValidations(
      checked
        ? [...this.otherValidations(), { validator: 'required', message: current?.message }]
        : this.otherValidations()
    );
  }

  private setRequiredMessage(message: string) {
    if (!this.requiredValidation()) return;

    this.emitValidations([
      ...this.otherValidations(),
      { validator: 'required', message: message || undefined },
    ]);
  }

  private textField(
    label: string,
    value: unknown,
    onCommit: (value: string) => void
  ) {
    return (
      <label class="fk-props__field">
        <span class="fk-props__label">{label}</span>
        <input
          class="fk-props__input"
          type="text"
          value={(value as string) ?? ''}
          onChange={(event) => onCommit((event.target as HTMLInputElement).value)}
        />
      </label>
    );
  }

  render() {
    const configs = this.brick.configs;
    const required = this.requiredValidation();
    const isInput = this.brick.type === 'input';

    return (
      <div class="fk-props">
        <header class="fk-props__header">
          <span class="fk-props__type">{this.brick.type}</span>
          <h4 class="fk-props__title">{this.brick.name}</h4>
        </header>

        <section class="fk-props__section">
          <h5 class="fk-props__section-title">Configuration</h5>
          {this.textField('Key', configs?.key, (value) =>
            this.emitConfigs({ key: value })
          )}
          {this.textField('Label', configs?.label, (value) =>
            this.emitConfigs({ label: value })
          )}
          {isInput
            ? this.textField('Placeholder', configs?.placeholder, (value) =>
                this.emitConfigs({ placeholder: value })
              )
            : null}
          {configs && 'options' in configs ? (
            <label class="fk-props__field">
              <span class="fk-props__label">Options (one per line)</span>
              <textarea
                class="fk-props__input fk-props__input--textarea"
                onChange={(event) =>
                  this.emitConfigs({
                    options: (event.target as HTMLTextAreaElement).value,
                  })
                }
              >
                {(configs.options as string) ?? ''}
              </textarea>
            </label>
          ) : null}
        </section>

        {isInput ? (
          <section class="fk-props__section">
            <h5 class="fk-props__section-title">Validation</h5>
            <label class="fk-props__field fk-props__field--inline">
              <input
                type="checkbox"
                checked={!!required}
                onChange={(event) =>
                  this.setRequired((event.target as HTMLInputElement).checked)
                }
              />
              <span class="fk-props__label">Required</span>
            </label>
            {required
              ? this.textField('Error message', required.message, (value) =>
                  this.setRequiredMessage(value)
                )
              : null}
          </section>
        ) : null}
      </div>
    );
  }
}
