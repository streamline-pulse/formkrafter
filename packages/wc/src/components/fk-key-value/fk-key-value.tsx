import { Component, Event, Prop, State, Watch, h } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';
import { fkT } from '../../i18n/i18n';

type Row = { key: string; value: string };

const asText = (value: unknown): string =>
  value === null || value === undefined ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);

const rowsOf = (value: unknown): Row[] =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? Object.entries(value as Record<string, unknown>).map(([key, raw]) => ({ key, value: asText(raw) }))
    : [];

/**
 * A flat object edited row by row (key, value). Rows with an empty key stay
 * local until named; values accept template variables through the picker.
 */
@Component({
  tag: 'fk-key-value',
  styleUrl: 'fk-key-value.css',
  scoped: true,
})
export class FkKeyValue {
  @Prop() value?: Record<string, unknown>;
  @Prop() keyLabel?: string;
  @Prop() valueLabel?: string;
  @Prop() variables: { name: string; label?: string }[] = [];
  @Prop() disabled = false;
  @Prop() readOnly = false;

  @Event() keyValueChange!: EventEmitter<Record<string, string> | undefined>;

  @State() rows: Row[] = [];

  componentWillLoad() {
    this.rows = rowsOf(this.value);
  }

  @Watch('value')
  onValueChange(next: unknown) {
    const incoming = rowsOf(next);
    const named = this.rows.filter((row) => row.key.trim());
    // Same object as the one we emitted: keep the rows (and the unnamed drafts).
    if (JSON.stringify(incoming) === JSON.stringify(named)) return;
    this.rows = incoming;
  }

  private get locked(): boolean {
    return this.disabled || this.readOnly;
  }

  private commit(rows: Row[]) {
    this.rows = rows;
    const out: Record<string, string> = {};
    for (const row of rows) if (row.key.trim()) out[row.key.trim()] = row.value;
    this.keyValueChange.emit(Object.keys(out).length ? out : undefined);
  }

  private update(index: number, patch: Partial<Row>) {
    this.commit(this.rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  render() {
    const keyLabel = this.keyLabel || fkT('keyValue.key');
    const valueLabel = this.valueLabel || fkT('keyValue.value');
    const withPicker = this.variables.length > 0 && !this.locked;
    return (
      <div class="fk-kv">
        {this.rows.length === 0 && this.locked ? <span class="fk-kv__empty">{fkT('keyValue.empty')}</span> : null}
        {this.rows.map((row, index) => (
          <div class="fk-kv__row" key={index}>
            <input
              class="fk-field__input fk-kv__key"
              type="text"
              aria-label={keyLabel}
              placeholder={keyLabel}
              value={row.key}
              disabled={this.disabled}
              readOnly={this.readOnly}
              onInput={(event) => this.update(index, { key: (event.target as HTMLInputElement).value })}
            />
            <div class={{ 'fk-kv__value': true, 'fk-variables': withPicker }}>
              <input
                class="fk-field__input"
                type="text"
                aria-label={valueLabel}
                placeholder={valueLabel}
                value={row.value}
                disabled={this.disabled}
                readOnly={this.readOnly}
                onInput={(event) => this.update(index, { value: (event.target as HTMLInputElement).value })}
              />
              {withPicker ? (
                <fk-variable-picker variables={this.variables} onVariablePick={(event: CustomEvent<string>) => this.update(index, { value: event.detail })}></fk-variable-picker>
              ) : null}
            </div>
            {!this.locked ? (
              <button type="button" class="fk-kv__remove" title={fkT('keyValue.remove')} onClick={() => this.commit(this.rows.filter((_, i) => i !== index))}>
                ✕
              </button>
            ) : null}
          </div>
        ))}
        {!this.locked ? (
          <button type="button" class="fk-kv__add" onClick={() => (this.rows = [...this.rows, { key: '', value: '' }])}>
            {fkT('keyValue.add')}
          </button>
        ) : null}
      </div>
    );
  }
}
