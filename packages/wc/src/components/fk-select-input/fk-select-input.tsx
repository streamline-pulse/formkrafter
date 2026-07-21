import { Component, Element, Event, Prop, State, Watch, h } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';
import { evalBrickCode, services } from '@streamline-pulse/formkrafter-core';
import { normalizeOptions } from '../../utils/options';
import type { SelectOption } from '../../utils/options';
import { fkT } from '../../i18n/i18n';

@Component({
  tag: 'fk-select-input',
  styleUrl: 'fk-select-input.css',
  scoped: true,
})
export class FkSelectInput {
  @Element() host!: HTMLElement;

  @Prop() configs?: Record<string, unknown>;
  @Prop() value?: string | string[];
  @Prop() disabled = false;
  @Prop() multiple = false;
  @Prop() dataMap?: Record<string, unknown>;

  @Event() selectValueChange!: EventEmitter<string | string[] | undefined>;

  @State() open = false;
  @State() query = '';
  @State() remoteOptions: unknown[] = [];
  @State() remoteError?: string;

  componentWillLoad() {
    return this.resolveRemote();
  }

  disconnectedCallback() {
    this.unbindOutsideClick();
  }

  @Watch('configs')
  onConfigsChange() {
    this.resolveRemote();
  }

  private outsideClick = (event: MouseEvent) => {
    if (!this.host.contains(event.target as Node)) this.close();
  };

  private bindOutsideClick() {
    document.addEventListener('mousedown', this.outsideClick);
  }

  private unbindOutsideClick() {
    document.removeEventListener('mousedown', this.outsideClick);
  }

  private toggleOpen() {
    if (this.disabled) return;
    if (this.open) this.close();
    else {
      this.open = true;
      this.query = '';
      this.bindOutsideClick();
    }
  }

  private close() {
    this.open = false;
    this.unbindOutsideClick();
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

  private selectedValues(): string[] {
    if (this.multiple) {
      return Array.isArray(this.value) ? this.value : [];
    }

    return typeof this.value === 'string' && this.value !== '' ? [this.value] : [];
  }

  private labelOf(value: string, options: SelectOption[]): string {
    return options.find((option) => option.value === value)?.label ?? value;
  }

  private pick(option: SelectOption) {
    if (this.multiple) {
      const selected = this.selectedValues();
      const next = selected.includes(option.value)
        ? selected.filter((value) => value !== option.value)
        : [...selected, option.value];

      this.selectValueChange.emit(next.length ? next : undefined);
      return;
    }

    this.selectValueChange.emit(option.value);
    this.close();
  }

  private unpick(value: string) {
    const next = this.selectedValues().filter((entry) => entry !== value);
    this.selectValueChange.emit(next.length ? next : undefined);
  }

  private filteredOptions(options: SelectOption[]): SelectOption[] {
    const query = this.query.trim().toLowerCase();
    if (!query) return options;

    return options.filter((option) =>
      option.label.toLowerCase().includes(query)
    );
  }

  render() {
    const { options, error } = this.resolve();
    const selected = this.selectedValues();
    const filtered = this.filteredOptions(options);

    return (
      <div class={{ 'fk-select': true, 'fk-select--disabled': this.disabled }}>
        <div
          class={{ 'fk-select__trigger': true, 'fk-select__trigger--open': this.open }}
          onClick={() => this.toggleOpen()}
        >
          <div class="fk-select__values">
            {selected.length === 0 ? (
              <span class="fk-select__placeholder">
                {String(this.configs?.placeholder ?? '')}
              </span>
            ) : this.multiple ? (
              selected.map((value) => (
                <span class="fk-select__chip" key={value}>
                  {this.labelOf(value, options)}
                  <button
                    type="button"
                    class="fk-select__chip-remove"
                    disabled={this.disabled}
                    onClick={(event) => {
                      event.stopPropagation();
                      this.unpick(value);
                    }}
                  >
                    ✕
                  </button>
                </span>
              ))
            ) : (
              <span class="fk-select__value">
                {this.labelOf(selected[0], options)}
              </span>
            )}
          </div>
          {!this.multiple && selected.length > 0 && !this.disabled ? (
            <button
              type="button"
              class="fk-select__clear"
              title={fkT('select.clear')}
              onClick={(event) => {
                event.stopPropagation();
                this.selectValueChange.emit(undefined);
              }}
            >
              ✕
            </button>
          ) : null}
          <span class="fk-select__caret">▾</span>
        </div>

        {this.open ? (
          <div class="fk-select__dropdown">
            <input
              class="fk-select__search"
              type="text"
              placeholder={fkT('select.search')}
              value={this.query}
              ref={(element) => setTimeout(() => element?.focus(), 0)}
              onInput={(event) =>
                (this.query = (event.target as HTMLInputElement).value)
              }
              onKeyDown={(event) => {
                if (event.key === 'Escape') this.close();
                if (event.key === 'Enter' && filtered.length > 0) {
                  event.preventDefault();
                  this.pick(filtered[0]);
                }
              }}
            />
            <div class="fk-select__options" role="listbox">
              {filtered.map((option) => {
                const isSelected = selected.includes(option.value);

                return (
                  <div
                    key={option.value}
                    role="option"
                    aria-selected={isSelected ? 'true' : 'false'}
                    class={{
                      'fk-select__option': true,
                      'fk-select__option--selected': isSelected,
                    }}
                    onClick={() => this.pick(option)}
                  >
                    <span class="fk-select__option-label">{option.label}</span>
                    {isSelected ? <span class="fk-select__check">✓</span> : null}
                  </div>
                );
              })}
              {filtered.length === 0 ? (
                <p class="fk-select__empty">{fkT('select.empty')}</p>
              ) : null}
            </div>
          </div>
        ) : null}

        {error ? <span class="fk-field__error">{error}</span> : null}
      </div>
    );
  }
}
