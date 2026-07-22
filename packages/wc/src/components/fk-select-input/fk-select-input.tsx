import { Component, Element, Event, Prop, State, Watch, h } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';
import { evalBrickCode, services } from '@streamline-pulse/formkrafter-core';
import { normalizeOptions } from '../../utils/options';
import {
  appendSearchParam,
  interpolateTemplate,
  parseHeaderLines,
} from '../../utils/remote';
import type { SelectOption } from '../../utils/options';
import { fkT } from '../../i18n/i18n';

let selectInstanceCounter = 0;

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
  @Prop() invalid = false;
  @Prop() dataMap?: Record<string, unknown>;

  @Event() selectValueChange!: EventEmitter<string | string[] | undefined>;

  @State() open = false;
  @State() query = '';
  @State() activeIndex = 0;

  private instanceId = `fk-select-${++selectInstanceCounter}`;
  private triggerEl?: HTMLElement;

  private lastRemoteSignature?: string;
  private searchTimer?: ReturnType<typeof setTimeout>;
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

  @Watch('dataMap')
  onDataMapChange() {
    this.resolveRemote();
  }

  private searchParam(): string | undefined {
    return (this.configs?.searchParam as string) || undefined;
  }

  private remoteUrl(): string | undefined {
    const raw = this.configs?.optionsUrl as string | undefined;
    if (!raw) return undefined;

    let url = interpolateTemplate(raw, this.dataMap);
    const param = this.searchParam();
    if (param) url = appendSearchParam(url, param, this.query.trim());

    return url;
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
    else this.openDropdown();
  }

  private openDropdown() {
    if (this.disabled || this.open) return;

    this.open = true;
    this.query = '';

    const { options } = this.resolve();
    const selected = this.selectedValues();
    const selectedIndex = options.findIndex((option) =>
      selected.includes(option.value)
    );
    this.activeIndex = selectedIndex >= 0 ? selectedIndex : 0;

    this.bindOutsideClick();
  }

  private close(refocusTrigger = false) {
    this.open = false;
    this.unbindOutsideClick();
    if (refocusTrigger) this.triggerEl?.focus();
  }

  private moveActive(delta: number, count: number) {
    if (!count) return;
    this.activeIndex = (this.activeIndex + delta + count) % count;
    this.scrollActiveIntoView();
  }

  private scrollActiveIntoView() {
    requestAnimationFrame(() => {
      const active = this.host.querySelector(
        `#${this.instanceId}-opt-${this.activeIndex}`
      ) as HTMLElement | null;
      active?.scrollIntoView?.({ block: 'nearest' });
    });
  }

  private onTriggerKeyDown = (event: KeyboardEvent) => {
    if (this.disabled) return;

    if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      this.openDropdown();
    } else if (event.key === 'Escape' && this.open) {
      event.preventDefault();
      this.close();
    }
  };

  private onSearchKeyDown(event: KeyboardEvent, filtered: SelectOption[]) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.moveActive(1, filtered.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.moveActive(-1, filtered.length);
        break;
      case 'Home':
        event.preventDefault();
        this.activeIndex = 0;
        this.scrollActiveIntoView();
        break;
      case 'End':
        event.preventDefault();
        this.activeIndex = Math.max(filtered.length - 1, 0);
        this.scrollActiveIntoView();
        break;
      case 'Enter': {
        event.preventDefault();
        const option = filtered[this.activeIndex] ?? filtered[0];
        if (option) this.pick(option);
        break;
      }
      case 'Escape':
        event.preventDefault();
        this.close(true);
        break;
      case 'Tab':
        this.close();
        break;
    }
  }

  private source(): string {
    return (this.configs?.optionsSource as string) ?? 'static';
  }

  private async resolveRemote(force = false) {
    if (this.source() !== 'remote') return;

    const url = this.remoteUrl();
    if (!url) {
      this.remoteOptions = [];
      return;
    }

    const headers = parseHeaderLines(this.configs?.optionsHeaders, this.dataMap);
    const signature = `${url}|${JSON.stringify(headers ?? {})}`;
    if (!force && signature === this.lastRemoteSignature) return;
    this.lastRemoteSignature = signature;

    try {
      this.remoteError = undefined;
      this.remoteOptions = await services.dataSourceService.fetchOptions(
        url,
        headers ? { headers } : undefined
      );
    } catch (error) {
      this.remoteOptions = [];
      this.remoteError = error instanceof Error ? error.message : String(error);
    }
  }

  private onSearchInput(value: string) {
    this.query = value;

    if (this.source() !== 'remote' || !this.searchParam()) return;

    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.resolveRemote(), 250);
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
    this.close(true);
  }

  private unpick(value: string) {
    const next = this.selectedValues().filter((entry) => entry !== value);
    this.selectValueChange.emit(next.length ? next : undefined);
  }

  private filteredOptions(options: SelectOption[]): SelectOption[] {
    if (this.source() === 'remote' && this.searchParam()) return options;

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
          role="combobox"
          tabIndex={this.disabled ? undefined : 0}
          aria-expanded={this.open ? 'true' : 'false'}
          aria-haspopup="listbox"
          aria-controls={`${this.instanceId}-listbox`}
          aria-disabled={this.disabled ? 'true' : undefined}
          aria-invalid={this.invalid ? 'true' : undefined}
          ref={(element) => (this.triggerEl = element)}
          onKeyDown={this.onTriggerKeyDown}
          onClick={(event) => {
            event.preventDefault();
            this.toggleOpen();
          }}
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
                    aria-label={`${fkT('select.clear')} — ${this.labelOf(value, options)}`}
                    disabled={this.disabled}
                    onClick={(event) => {
                      event.preventDefault();
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
              aria-label={fkT('select.clear')}
              onClick={(event) => {
                event.preventDefault();
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
              role="combobox"
              aria-expanded="true"
              aria-autocomplete="list"
              aria-controls={`${this.instanceId}-listbox`}
              aria-activedescendant={
                filtered.length
                  ? `${this.instanceId}-opt-${Math.min(this.activeIndex, filtered.length - 1)}`
                  : undefined
              }
              ref={(element) => setTimeout(() => element?.focus(), 0)}
              onInput={(event) => {
                this.activeIndex = 0;
                this.onSearchInput((event.target as HTMLInputElement).value);
              }}
              onKeyDown={(event) => this.onSearchKeyDown(event, filtered)}
            />
            <div
              class="fk-select__options"
              role="listbox"
              id={`${this.instanceId}-listbox`}
              aria-multiselectable={this.multiple ? 'true' : undefined}
            >
              {filtered.map((option, index) => {
                const isSelected = selected.includes(option.value);
                const isActive = index === Math.min(this.activeIndex, filtered.length - 1);

                return (
                  <div
                    key={option.value}
                    id={`${this.instanceId}-opt-${index}`}
                    role="option"
                    aria-selected={isSelected ? 'true' : 'false'}
                    class={{
                      'fk-select__option': true,
                      'fk-select__option--selected': isSelected,
                      'fk-select__option--active': isActive,
                    }}
                    onMouseEnter={() => (this.activeIndex = index)}
                    onClick={(event) => {
                      event.preventDefault();
                      this.pick(option);
                    }}
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
