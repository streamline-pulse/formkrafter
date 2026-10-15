import { Component, Element, Event, Listen, Method, Prop, State, h } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';
import { validateBrickSpecDataDetailed } from '@streamline-pulse/formkrafter-core';
import type {
  BrickSpec,
  FieldAnnotations,
  Utils,
  ValidationResult,
} from '@streamline-pulse/formkrafter-core';
import { fkT, fkTOr } from '../../i18n/i18n';
import type { BrickReviewChangeDetail } from '../../utils/events';

@Component({
  tag: 'fk-data-grid',
  styleUrl: 'fk-data-grid.css',
  scoped: true,
})
export class FkDataGrid {
  @Element() host!: HTMLElement;

  @Prop() spec!: BrickSpec;
  @Prop() value?: unknown;
  @Prop() disabled = false;
  @Prop() readOnly = false;
  @Prop() locale?: string;
  @Prop() utils!: Utils;
  /** Review maps keyed `grid[index].field`, scoped to each row. */
  @Prop() annotations?: FieldAnnotations;
  @Prop() notes?: FieldAnnotations;
  @Prop() reviewable = false;
  @Prop() editableKeys?: string[];

  @Event() gridValueChange!: EventEmitter<
    Array<Record<string, unknown>> | undefined
  >;
  @Event() brickReviewChange!: EventEmitter<BrickReviewChangeDetail>;

  private gridKey(): string {
    return this.spec.configs?.key ?? 'grid';
  }

  private rowScoped(map: FieldAnnotations | undefined, index: number): FieldAnnotations | undefined {
    if (!map) return undefined;
    const prefix = `${this.gridKey()}[${index}].`;
    const scoped: FieldAnnotations = {};
    for (const [key, value] of Object.entries(map)) {
      if (key.startsWith(prefix)) scoped[key.slice(prefix.length)] = value;
    }
    return scoped;
  }

  // Grille entierement modifiable quand sa cle est listee ; sinon seules les
  // cellules listees (`grid[i].champ`) le sont.
  private rowEditableKeys(index: number): string[] | undefined {
    if (this.editableKeys === undefined || this.editableKeys.includes(this.gridKey())) return undefined;
    const prefix = `${this.gridKey()}[${index}].`;
    return this.editableKeys.filter((key) => key.startsWith(prefix)).map((key) => key.slice(prefix.length));
  }

  private rowsLocked(): boolean {
    return this.editableKeys !== undefined && !this.editableKeys.includes(this.gridKey());
  }

  // Un signalement fait dans une ligne remonte avec la cle complete de la cellule.
  @Listen('brickReviewChange')
  handleRowReviewChange(event: CustomEvent<BrickReviewChangeDetail>) {
    if (event.target === this.host) return;
    event.stopPropagation();
    const row = (event.target as HTMLElement).closest('[data-grid-row]');
    const index = row?.getAttribute('data-grid-row');
    if (index === null || index === undefined) return;
    this.brickReviewChange.emit({
      key: `${this.gridKey()}[${index}].${event.detail.key}`,
      annotation: event.detail.annotation,
    });
  }

  @State() touched: Record<number, Record<string, boolean>> = {};

  private rowSpecCache?: { source: BrickSpec; rowSpec: BrickSpec };

  private rows(): Array<Record<string, unknown>> {
    return Array.isArray(this.value)
      ? (this.value as Array<Record<string, unknown>>)
      : [];
  }

  private rowSpec(): BrickSpec {
    if (this.rowSpecCache?.source !== this.spec) {
      this.rowSpecCache = {
        source: this.spec,
        rowSpec: {
          type: 'panel',
          id: 'grid-row',
          name: 'Row',
          configs: { key: 'row' },
          children: this.spec.children ?? [],
        },
      };
    }

    return this.rowSpecCache.rowSpec;
  }

  private rowErrors(row: Record<string, unknown>): Record<string, string> {
    const present = Object.fromEntries(
      Object.entries(row).filter(
        ([, value]) => value !== '' && value !== null && value !== undefined
      )
    );

    return validateBrickSpecDataDetailed(this.rowSpec(), present, this.locale)
      .errors;
  }

  private visibleRowErrors(index: number): Record<string, string> {
    const row = this.rows()[index] ?? {};
    const touched = this.touched[index] ?? {};
    const errors: Record<string, string> = {};

    for (const [key, message] of Object.entries(this.rowErrors(row))) {
      if (touched[key]) errors[key] = message;
    }

    return errors;
  }

  @Listen('brickDataChange')
  handleRowChange(event: CustomEvent<Record<string, unknown>>) {
    event.stopPropagation();

    const origin = event.target as HTMLElement;
    const rowEl = origin.closest('[data-grid-row]');
    const index = Number(rowEl?.getAttribute('data-grid-row') ?? -1);
    if (index < 0) return;

    const rowTouched = { ...(this.touched[index] ?? {}) };
    for (const key of Object.keys(event.detail)) rowTouched[key] = true;
    this.touched = { ...this.touched, [index]: rowTouched };

    const rows = this.rows().map((row, i) =>
      i === index ? { ...row, ...event.detail } : row
    );
    this.gridValueChange.emit(rows);
  }

  @Method()
  async validateRows(): Promise<ValidationResult> {
    const rows = this.rows();
    const gridKey = this.spec.configs?.key ?? 'grid';
    const allTouched: Record<number, Record<string, boolean>> = {};
    const errors: Record<string, string> = {};

    rows.forEach((row, index) => {
      const rowTouched: Record<string, boolean> = {};
      for (const child of this.spec.children ?? []) {
        if (child.configs?.key) rowTouched[child.configs.key] = true;
      }
      allTouched[index] = rowTouched;

      for (const [key, message] of Object.entries(this.rowErrors(row))) {
        errors[`${gridKey}[${index}].${key}`] = message;
      }
    });

    this.touched = allTouched;

    return { valid: Object.keys(errors).length === 0, errors };
  }

  private addRow = (event: MouseEvent) => {
    event.preventDefault();
    this.gridValueChange.emit([...this.rows(), {}]);
  };

  private moveRow(index: number, delta: number) {
    const rows = [...this.rows()];
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;

    const [moved] = rows.splice(index, 1);
    rows.splice(target, 0, moved);

    const touched = { ...this.touched };
    const movedTouched = touched[index];
    touched[index] = touched[target];
    touched[target] = movedTouched;
    this.touched = touched;

    this.gridValueChange.emit(rows);
  }

  private removeRow(index: number) {
    const rows = this.rows().filter((_, i) => i !== index);

    const touched: Record<number, Record<string, boolean>> = {};
    for (const [key, value] of Object.entries(this.touched)) {
      const i = Number(key);
      if (i < index) touched[i] = value;
      else if (i > index) touched[i - 1] = value;
    }
    this.touched = touched;

    this.gridValueChange.emit(rows.length ? rows : undefined);
  }

  render() {
    const children = this.spec.children ?? [];
    const rows = this.rows();

    return (
      <div class="fk-grid">
        {rows.length === 0 ? (
          <p class="fk-grid__empty">{fkT('grid.empty')}</p>
        ) : null}

        {rows.map((row, index) => (
          <div class="fk-grid__row" data-grid-row={index} key={index}>
            <div class="fk-grid__cells">
              {children.map((child, childIndex) => (
                <fk-brick-render
                  brickSpec={child}
                  data={row}
                  dataMap={row}
                  errors={this.visibleRowErrors(index)}
                  annotations={this.rowScoped(this.annotations, index)}
                  notes={this.rowScoped(this.notes, index)}
                  reviewable={this.reviewable}
                  editableKeys={this.rowEditableKeys(index)}
                  locale={this.locale}
                  readOnly={this.readOnly}
                  disabled={this.disabled && !this.readOnly}
                  path={`grid.${index}.${childIndex}`}
                  utils={this.utils}
                />
              ))}
            </div>
            <div class="fk-grid__row-actions">
              <button
                type="button"
                class="fk-grid__move"
                title={fkTOr('grid.moveUp', 'Move row up')}
                aria-label={fkTOr('grid.moveUp', 'Move row up')}
                disabled={this.disabled || this.rowsLocked() || index === 0}
                onClick={(event) => {
                  event.preventDefault();
                  this.moveRow(index, -1);
                }}
              >
                ↑
              </button>
              <button
                type="button"
                class="fk-grid__move"
                title={fkTOr('grid.moveDown', 'Move row down')}
                aria-label={fkTOr('grid.moveDown', 'Move row down')}
                disabled={this.disabled || this.rowsLocked() || index === rows.length - 1}
                onClick={(event) => {
                  event.preventDefault();
                  this.moveRow(index, 1);
                }}
              >
                ↓
              </button>
              <button
                type="button"
                class="fk-grid__remove"
                title={fkT('grid.removeRow')}
                aria-label={fkT('grid.removeRow')}
                disabled={this.disabled || this.rowsLocked()}
                onClick={(event) => {
                  event.preventDefault();
                  this.removeRow(index);
                }}
              >
                ✕
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          class="fk-grid__add"
          disabled={this.disabled || this.rowsLocked()}
          onClick={this.addRow}
        >
          {fkT('grid.addRow')}
        </button>
      </div>
    );
  }
}
