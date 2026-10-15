import { Component, Event, Prop, State, Watch, h } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';
import { generateSlots, groupSlotsByDay, readSlots } from '@streamline-pulse/formkrafter-core';
import type { Slot, SlotRules } from '@streamline-pulse/formkrafter-core';
import { fkT } from '../../i18n/i18n';

export interface PickedSlot {
  id: string;
  start: string;
  end: string;
}

const dayLabel = (day: string, locale?: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
};

const timeLabel = (iso: string) => iso.slice(11, 16);

/**
 * Picks an appointment slot (the event is `slotPick`: `slotChange` would collide with
 * the browser's native `slotchange` event in the JSX binding): the days that still have slots, then the slots
 * of the chosen day. Slots come from a URL (`slotsUrl`, answering a list with
 * `remaining` counts) or are generated from the opening rules.
 */
@Component({
  tag: 'fk-slot-picker',
  styleUrl: 'fk-slot-picker.css',
  scoped: true,
})
export class FkSlotPicker {
  @Prop() value?: PickedSlot;
  @Prop() slotsUrl?: string;
  @Prop() rules: SlotRules = {};
  @Prop() locale?: string;
  @Prop() disabled = false;
  @Prop() readOnly = false;

  @Event() slotPick!: EventEmitter<PickedSlot | undefined>;

  @State() slots: Slot[] = [];
  @State() day = '';
  @State() loading = false;
  @State() failed = false;

  componentWillLoad() {
    this.day = this.value ? this.value.start.slice(0, 10) : '';
    return this.load();
  }

  @Watch('slotsUrl')
  @Watch('rules')
  reload() {
    return this.load();
  }

  @Watch('value')
  onValueChange(next: PickedSlot | undefined) {
    if (next) this.day = next.start.slice(0, 10);
  }

  private get locked(): boolean {
    return this.disabled || this.readOnly;
  }

  private async load() {
    this.failed = false;
    if (!this.slotsUrl) {
      this.slots = generateSlots(this.rules);
      return;
    }
    this.loading = true;
    try {
      const response = await fetch(this.slotsUrl, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(String(response.status));
      this.slots = readSlots(await response.json());
    } catch {
      this.failed = true;
      this.slots = [];
    } finally {
      this.loading = false;
    }
  }

  private pick(slot: Slot) {
    if (this.locked) return;
    this.slotPick.emit({ id: slot.id, start: slot.start, end: slot.end });
  }

  render() {
    const days = groupSlotsByDay(this.slots);
    const picked = this.value;
    const current = days.find((entry) => entry.day === this.day) ?? days[0];
    if (this.locked) {
      return (
        <div class="fk-slots fk-slots--locked">
          {picked ? (
            <span class="fk-slots__picked">
              {dayLabel(picked.start.slice(0, 10), this.locale)} · {timeLabel(picked.start)}–{timeLabel(picked.end)}
            </span>
          ) : (
            <span class="fk-slots__empty">{fkT('slots.none')}</span>
          )}
        </div>
      );
    }
    return (
      <div class="fk-slots">
        {this.loading ? <span class="fk-slots__empty">{fkT('slots.loading')}</span> : null}
        {this.failed ? <span class="fk-slots__empty">{fkT('slots.unavailable')}</span> : null}
        {!this.loading && !this.failed && days.length === 0 ? <span class="fk-slots__empty">{fkT('slots.empty')}</span> : null}
        {days.length ? (
          <div class="fk-slots__days" role="tablist">
            {days.map((entry) => (
              <button
                type="button"
                role="tab"
                aria-selected={entry.day === current?.day ? 'true' : 'false'}
                class={{ 'fk-slots__day': true, 'fk-slots__day--active': entry.day === current?.day }}
                onClick={() => {
                  this.day = entry.day;
                }}
              >
                {dayLabel(entry.day, this.locale)}
              </button>
            ))}
          </div>
        ) : null}
        {current ? (
          <div class="fk-slots__times">
            {current.slots.map((slot) => (
              <button
                type="button"
                class={{ 'fk-slots__time': true, 'fk-slots__time--picked': picked?.id === slot.id }}
                aria-pressed={picked?.id === slot.id ? 'true' : 'false'}
                onClick={() => this.pick(slot)}
              >
                {timeLabel(slot.start)}
                {slot.remaining !== undefined ? <small> · {slot.remaining}</small> : null}
              </button>
            ))}
          </div>
        ) : null}
        {picked ? (
          <p class="fk-slots__picked">
            {fkT('slots.picked')} {dayLabel(picked.start.slice(0, 10), this.locale)} · {timeLabel(picked.start)}–{timeLabel(picked.end)}
            <button type="button" class="fk-slots__clear" onClick={() => this.slotPick.emit(undefined)}>
              {fkT('geo.clear')}
            </button>
          </p>
        ) : null}
      </div>
    );
  }
}
