import { Component, Element, Event, Prop, State, h } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';
import { fkT } from '../../i18n/i18n';

export interface FkVariable {
  /** What goes between the braces: `{{name}}`. */
  name: string;
  /** Human label shown next to the name. */
  label?: string;
}

const OPEN = '{{';
const CLOSE = '}}';
const MAX_ITEMS = 12;

/**
 * Suggests template variables inside the text control that precedes it.
 * Typing `{{` opens the list, the text after it filters, Enter or a click
 * inserts `{{name}}` in place of what was typed. The host form passes the
 * variables through its context as `_variables`.
 */
@Component({
  tag: 'fk-variable-picker',
  styleUrl: 'fk-variable-picker.css',
  scoped: true,
})
export class FkVariablePicker {
  @Element() el!: HTMLElement;
  @Prop() variables: FkVariable[] = [];

  @State() open = false;
  @State() query = '';
  @State() index = 0;
  /** Where the typed `{{...` starts, so the pick can replace it. */
  private tokenStart = -1;
  private control: HTMLInputElement | HTMLTextAreaElement | null = null;
  private closeTimer: ReturnType<typeof setTimeout> | null = null;

  @Event() variablePick!: EventEmitter<string>;

  componentDidLoad() {
    const previous = this.el.previousElementSibling;
    if (previous instanceof HTMLInputElement || previous instanceof HTMLTextAreaElement) {
      this.control = previous;
      previous.addEventListener('input', this.sync);
      previous.addEventListener('click', this.sync);
      previous.addEventListener('keyup', this.onKeyUp);
      previous.addEventListener('keydown', this.onKeyDown);
      previous.addEventListener('blur', this.closeSoon);
    }
  }

  disconnectedCallback() {
    const control = this.control;
    if (!control) return;
    control.removeEventListener('input', this.sync);
    control.removeEventListener('click', this.sync);
    control.removeEventListener('keyup', this.onKeyUp);
    control.removeEventListener('keydown', this.onKeyDown);
    control.removeEventListener('blur', this.closeSoon);
    if (this.closeTimer) clearTimeout(this.closeTimer);
  }

  private matches(): FkVariable[] {
    const query = this.query.toLowerCase();
    const list = query
      ? this.variables.filter(
          (variable) =>
            variable.name.toLowerCase().includes(query) ||
            (variable.label ?? '').toLowerCase().includes(query)
        )
      : this.variables;
    return list.slice(0, MAX_ITEMS);
  }

  // The token is an unclosed `{{` before the caret, with no space inside.
  private sync = () => {
    const control = this.control;
    if (!control) return;
    const caret = control.selectionStart ?? control.value.length;
    const before = control.value.slice(0, caret);
    const start = before.lastIndexOf(OPEN);
    if (start === -1 || before.slice(start).includes(CLOSE) || /\s/.test(before.slice(start + OPEN.length))) {
      this.close();
      return;
    }
    // A close scheduled by the previous keystroke (the first `{`) must not
    // undo the opening triggered by the second one.
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
    this.tokenStart = start;
    this.query = before.slice(start + OPEN.length);
    this.index = 0;
    this.open = true;
  };

  private close = () => {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
    this.open = false;
  };

  // On blur, let a click on an item land before the list goes away.
  private closeSoon = () => {
    if (this.closeTimer) clearTimeout(this.closeTimer);
    this.closeTimer = setTimeout(() => {
      this.closeTimer = null;
      this.open = false;
    }, 120);
  };

  private onKeyUp = (event: KeyboardEvent) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(event.key)) return;
    this.sync();
  };

  private onKeyDown = (event: KeyboardEvent) => {
    if (!this.open) return;
    const items = this.matches();
    if (event.key === 'ArrowDown') {
      this.index = (this.index + 1) % Math.max(items.length, 1);
      event.preventDefault();
    } else if (event.key === 'ArrowUp') {
      this.index = (this.index - 1 + Math.max(items.length, 1)) % Math.max(items.length, 1);
      event.preventDefault();
    } else if (event.key === 'Enter' && items[this.index]) {
      this.pick(items[this.index]);
      event.preventDefault();
    } else if (event.key === 'Escape') {
      this.open = false;
      event.preventDefault();
    }
  };

  private pick(variable: FkVariable) {
    const control = this.control;
    if (!control || this.tokenStart < 0) return;
    const caret = control.selectionStart ?? control.value.length;
    const inserted = `${OPEN}${variable.name}${CLOSE}`;
    const next = control.value.slice(0, this.tokenStart) + inserted + control.value.slice(caret);
    const position = this.tokenStart + inserted.length;
    control.value = next;
    control.setSelectionRange(position, position);
    this.open = false;
    this.variablePick.emit(next);
    control.focus();
  }

  render() {
    if (!this.open) return null;
    const items = this.matches();
    return (
      <div class="fk-variables__list" role="listbox">
        {items.length === 0 ? (
          <div class="fk-variables__empty">{fkT('variables.empty')}</div>
        ) : (
          items.map((variable, i) => (
            <button
              type="button"
              role="option"
              aria-selected={i === this.index ? 'true' : 'false'}
              class={{ 'fk-variables__item': true, 'fk-variables__item--active': i === this.index }}
              onMouseDown={(event) => {
                event.preventDefault();
                this.pick(variable);
              }}
              onMouseEnter={() => {
                this.index = i;
              }}
            >
              <code class="fk-variables__name">{variable.name}</code>
              {variable.label ? <span class="fk-variables__label">{variable.label}</span> : null}
            </button>
          ))
        )}
      </div>
    );
  }
}
