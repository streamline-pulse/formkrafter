import { Component, Event, Prop, State, Watch, h } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';
import { evalBrickCode, services } from '@streamline-pulse/formkrafter-core';
import { normalizeOptions } from '../../utils/options';
import type { SelectOption } from '../../utils/options';

@Component({
  tag: 'fk-select-input',
  shadow: false,
})
export class FkSelectInput {
  @Prop() configs?: Record<string, unknown>;
  @Prop() value?: string;
  @Prop() disabled = false;
  @Prop() dataMap?: Record<string, unknown>;

  @Event() selectValueChange!: EventEmitter<string | undefined>;

  @State() remoteOptions: unknown[] = [];
  @State() remoteError?: string;

  componentWillLoad() {
    return this.resolveRemote();
  }

  @Watch('configs')
  onConfigsChange() {
    this.resolveRemote();
  }

  private source(): string {
    return (this.configs?.optionsSource as string) ?? 'static';
  }

  private async resolveRemote() {
    if (this.source() !== 'remote') return;

    const url = this.configs?.optionsUrl as string | undefined;
    if (!url) {
      this.remoteOptions = [];
      return;
    }

    try {
      this.remoteError = undefined;
      this.remoteOptions = await services.dataSourceService.fetchOptions(url);
    } catch (error) {
      this.remoteOptions = [];
      this.remoteError = error instanceof Error ? error.message : String(error);
    }
  }

  private resolve(): { options: SelectOption[]; error?: string } {
    const labelKey = (this.configs?.labelKey as string) || undefined;
    const valueKey = (this.configs?.valueKey as string) || undefined;

    switch (this.source()) {
      case 'remote':
        return {
          options: normalizeOptions(this.remoteOptions, labelKey, valueKey),
          error: this.remoteError,
        };
      case 'dataMap': {
        const path = this.configs?.optionsPath as string | undefined;
        return {
          options: normalizeOptions(
            path ? this.dataMap?.[path] : [],
            labelKey,
            valueKey
          ),
        };
      }
      case 'js': {
        const code = this.configs?.optionsCode as string | undefined;
        if (!code) return { options: [] };

        const result = evalBrickCode(code, this.dataMap);
        if (result instanceof Error) {
          return { options: [], error: result.message };
        }

        return { options: normalizeOptions(result, labelKey, valueKey) };
      }
      default:
        return {
          options: normalizeOptions(this.configs?.options, labelKey, valueKey),
        };
    }
  }

  render() {
    const { options, error } = this.resolve();

    return (
      <div class="fk-select">
        <select
          class="fk-field__input"
          disabled={this.disabled}
          onInput={(event) => {
            const raw = (event.target as HTMLSelectElement).value;
            this.selectValueChange.emit(raw === '' ? undefined : raw);
          }}
        >
          <option value="" selected={this.value == null || this.value === ''}></option>
          {options.map((option) => (
            <option value={option.value} selected={this.value === option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error ? <span class="fk-field__error">{error}</span> : null}
      </div>
    );
  }
}
