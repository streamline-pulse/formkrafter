import { Component, Event, Prop, State, Watch, h } from '@stencil/core';
import type { EventEmitter, VNode } from '@stencil/core';
import type {
  BrickSpec,
  Validation,
  Validator,
} from '@streamline-pulse/formkrafter-core';
import type {
  BrickConfigsChangeDetail,
  BrickStylesChangeDetail,
  BrickValidationsChangeDetail,
} from '../../utils/events';

type PanelTab = 'config' | 'validation' | 'styles' | 'rules';

@Component({
  tag: 'fk-property-panel',
  styleUrl: 'fk-property-panel.css',
  scoped: true,
})
export class FkPropertyPanel {
  @Prop() brick!: BrickSpec;
  @Prop() fields: string[] = [];

  @Event() brickConfigsChange!: EventEmitter<BrickConfigsChangeDetail>;
  @Event() brickValidationsChange!: EventEmitter<BrickValidationsChangeDetail>;
  @Event() brickStylesChange!: EventEmitter<BrickStylesChangeDetail>;

  @State() activeTab: PanelTab = 'config';
  @State() newStyleKey = '';

  @Watch('brick')
  onBrickChange() {
    if (!this.availableTabs().some((tab) => tab.id === this.activeTab)) {
      this.activeTab = 'config';
    }
  }

  private availableTabs(): Array<{ id: PanelTab; label: string }> {
    const tabs: Array<{ id: PanelTab; label: string }> = [
      { id: 'config', label: 'Config' },
    ];

    if (this.brick.type === 'input') {
      tabs.push({ id: 'validation', label: 'Validation' });
    }

    tabs.push({ id: 'styles', label: 'Styles' }, { id: 'rules', label: 'Rules' });

    return tabs;
  }

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

  private emitStyles(patch: Record<string, unknown>) {
    const uid = this.brick.configs?.uid;
    if (!uid) return;

    this.brickStylesChange.emit({ styles: patch, uid });
  }

  private validationOf(validator: Validator): Validation | undefined {
    return this.brick.validations?.find(
      (validation) => validation.validator === validator
    );
  }

  private setValidation(
    validator: Validator,
    active: boolean,
    patch: Partial<Validation> = {}
  ) {
    const current = this.validationOf(validator);
    const others = (this.brick.validations ?? []).filter(
      (validation) => validation.validator !== validator
    );

    this.emitValidations(
      active ? [...others, { ...current, validator, ...patch }] : others
    );
  }

  private addStyle(value: string) {
    const key = this.newStyleKey.trim();
    if (!key) return;

    this.emitStyles({ [key]: value });
    this.newStyleKey = '';
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

  private optionsFields(): VNode[] {
    const configs = this.brick.configs;
    if (!configs || !('options' in configs || 'optionsSource' in configs)) {
      return [];
    }

    const supportsSources = 'optionsSource' in configs;
    const source = supportsSources
      ? ((configs.optionsSource as string) ?? 'static')
      : 'static';
    const nodes: VNode[] = supportsSources
      ? [
          <label class="fk-props__field">
            <span class="fk-props__label">Options source</span>
            <select
              class="fk-props__input"
              onChange={(event) =>
                this.emitConfigs({
                  optionsSource: (event.target as HTMLSelectElement).value,
                })
              }
            >
              {['static', 'dataMap', 'remote', 'js'].map((candidate) => (
                <option value={candidate} selected={candidate === source}>
                  {candidate}
                </option>
              ))}
            </select>
          </label>,
        ]
      : [];

    if (source === 'static') {
      nodes.push(
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
      );
    }

    if (source === 'dataMap') {
      nodes.push(
        this.textField('Data key', configs.optionsPath, (value) =>
          this.emitConfigs({ optionsPath: value })
        )
      );
    }

    if (source === 'remote') {
      nodes.push(
        this.textField('URL', configs.optionsUrl, (value) =>
          this.emitConfigs({ optionsUrl: value })
        )
      );
    }

    if (source === 'js') {
      nodes.push(
        <label class="fk-props__field">
          <span class="fk-props__label">Code</span>
          <fk-code-editor
            value={(configs.optionsCode as string) ?? ''}
            placeholder="return dataMap.country === 'BJ' ? ['Cotonou'] : ['Paris'];"
            onCodeChange={(event) => this.emitConfigs({ optionsCode: event.detail })}
          />
        </label>
      );
    }

    if (source === 'remote' || source === 'js') {
      nodes.push(
        this.textField('Label key', configs.labelKey, (value) =>
          this.emitConfigs({ labelKey: value })
        ),
        this.textField('Value key', configs.valueKey, (value) =>
          this.emitConfigs({ valueKey: value })
        )
      );
    }

    return nodes;
  }

  private renderConfigTab() {
    const configs = this.brick.configs;
    const isInput = this.brick.type === 'input';

    return (
      <section class="fk-props__section">
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
        {this.optionsFields()}
      </section>
    );
  }

  private validationRow(
    validator: Validator,
    label: string,
    valueType?: 'number' | 'text'
  ) {
    const rule = this.validationOf(validator);

    return (
      <div class="fk-props__vrule">
        <label class="fk-props__field fk-props__field--inline">
          <input
            type="checkbox"
            checked={!!rule}
            onChange={(event) =>
              this.setValidation(
                validator,
                (event.target as HTMLInputElement).checked
              )
            }
          />
          <span class="fk-props__label">{label}</span>
        </label>
        {rule && valueType ? (
          <input
            class="fk-props__input"
            type={valueType}
            placeholder={valueType === 'number' ? 'value' : 'regex'}
            value={rule.value == null ? '' : String(rule.value)}
            onChange={(event) => {
              const raw = (event.target as HTMLInputElement).value;
              this.setValidation(validator, true, {
                value:
                  valueType === 'number'
                    ? raw === ''
                      ? undefined
                      : Number(raw)
                    : raw || undefined,
              });
            }}
          />
        ) : null}
        {rule
          ? this.textField('Error message', rule.message, (value) =>
              this.setValidation(validator, true, {
                message: value || undefined,
              })
            )
          : null}
      </div>
    );
  }

  private renderValidationTab() {
    const dataType = this.brick.dataType;
    const custom = this.validationOf('custom');

    return (
      <section class="fk-props__section">
        {this.validationRow('required', 'Required')}
        {dataType === 'string'
          ? [
              this.validationRow('minLength', 'Min length', 'number'),
              this.validationRow('maxLength', 'Max length', 'number'),
              this.validationRow('pattern', 'Pattern (regex)', 'text'),
              this.validationRow('email', 'Email format'),
              this.validationRow('url', 'URL format'),
            ]
          : null}
        {dataType === 'number'
          ? [
              this.validationRow('min', 'Min', 'number'),
              this.validationRow('max', 'Max', 'number'),
            ]
          : null}

        <div class="fk-props__vrule">
          <label class="fk-props__field fk-props__field--inline">
            <input
              type="checkbox"
              checked={!!custom}
              onChange={(event) =>
                this.setValidation(
                  'custom',
                  (event.target as HTMLInputElement).checked,
                  { customValidator: custom?.customValidator ?? 'return true;' }
                )
              }
            />
            <span class="fk-props__label">Custom (JavaScript)</span>
          </label>
          {custom ? (
            <fk-code-editor
              value={custom.customValidator ?? ''}
              placeholder={'return value?.startsWith("BJ-") ? true : "Must start with BJ-";'}
              onCodeChange={(event) =>
                this.setValidation('custom', true, {
                  customValidator: event.detail,
                })
              }
            />
          ) : null}
          {custom
            ? this.textField('Fallback message', custom.message, (value) =>
                this.setValidation('custom', true, {
                  message: value || undefined,
                })
              )
            : null}
        </div>
      </section>
    );
  }

  private renderStylesTab() {
    return (
      <section class="fk-props__section">
        {Object.entries(this.brick.styles ?? {}).map(([key, value]) => (
          <div class="fk-props__style-row" key={key}>
            <span class="fk-props__style-key">{key}</span>
            <input
              class="fk-props__input fk-props__input--grow"
              type="text"
              value={String(value ?? '')}
              onChange={(event) =>
                this.emitStyles({
                  [key]: (event.target as HTMLInputElement).value,
                })
              }
            />
            <button
              type="button"
              class="fk-props__remove"
              title="Remove style"
              onClick={() => this.emitStyles({ [key]: undefined })}
            >
              ✕
            </button>
          </div>
        ))}
        <div class="fk-props__style-row">
          <input
            class="fk-props__input"
            type="text"
            placeholder="property"
            value={this.newStyleKey}
            onInput={(event) =>
              (this.newStyleKey = (event.target as HTMLInputElement).value)
            }
          />
          <input
            class="fk-props__input fk-props__input--grow"
            type="text"
            placeholder="value"
            onChange={(event) => {
              const target = event.target as HTMLInputElement;
              this.addStyle(target.value);
              target.value = '';
            }}
          />
        </div>
      </section>
    );
  }

  render() {
    return (
      <div class="fk-props">
        <header class="fk-props__header">
          <span class="fk-props__type">{this.brick.type}</span>
          <h4 class="fk-props__title">{this.brick.name}</h4>
        </header>

        <div class="fk-props__tabs">
          {this.availableTabs().map((tab) => (
            <button
              key={tab.id}
              type="button"
              class={{
                'fk-props__tab': true,
                'fk-props__tab--active': this.activeTab === tab.id,
              }}
              onClick={() => (this.activeTab = tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {this.activeTab === 'config' ? this.renderConfigTab() : null}
        {this.activeTab === 'validation' ? this.renderValidationTab() : null}
        {this.activeTab === 'styles' ? this.renderStylesTab() : null}
        {this.activeTab === 'rules' ? (
          <section class="fk-props__section">
            <fk-rules-editor brick={this.brick} fields={this.fields} />
          </section>
        ) : null}
      </div>
    );
  }
}
