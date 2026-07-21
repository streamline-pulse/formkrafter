import { Component, Element, Prop, State, Watch, h } from '@stencil/core';

@Component({
  tag: 'fk-stepper',
  styleUrl: 'fk-stepper.css',
  scoped: true,
})
export class FkStepper {
  @Element() host!: HTMLElement;

  @Prop() stepLabels: string[] = [];
  @Prop() editable = false;

  @State() active = 0;

  private bodyEl?: HTMLElement;

  @Watch('stepLabels')
  clampActive() {
    if (this.active > Math.max(this.stepLabels.length - 1, 0)) {
      this.active = 0;
    }
  }

  componentDidRender() {
    if (!this.bodyEl) return;

    Array.from(this.bodyEl.children).forEach((child, index) => {
      const element = child as HTMLElement;
      if (this.editable) element.style.removeProperty('display');
      else element.style.display = index === this.active ? '' : 'none';
    });
  }

  render() {
    const lastStep = Math.max(this.stepLabels.length - 1, 0);

    return (
      <div class="fk-stepper">
        <ol class="fk-stepper__nav">
          {this.stepLabels.map((label, index) => (
            <li
              key={`${index}-${label}`}
              class={{
                'fk-stepper__step': true,
                'fk-stepper__step--active': index === this.active,
                'fk-stepper__step--done': !this.editable && index < this.active,
              }}
              onClick={() => (this.active = index)}
            >
              <span class="fk-stepper__index">{index + 1}</span>
              <span class="fk-stepper__label">{label}</span>
            </li>
          ))}
        </ol>

        <div class="fk-stepper__body" ref={(element) => (this.bodyEl = element)}>
          <slot></slot>
        </div>

        {!this.editable && this.stepLabels.length > 1 ? (
          <div class="fk-stepper__actions">
            <button
              type="button"
              class="fk-stepper__button"
              disabled={this.active === 0}
              onClick={() => (this.active = Math.max(this.active - 1, 0))}
            >
              ← Back
            </button>
            <button
              type="button"
              class="fk-stepper__button fk-stepper__button--primary"
              hidden={this.active === lastStep}
              onClick={() => (this.active = Math.min(this.active + 1, lastStep))}
            >
              Next →
            </button>
          </div>
        ) : null}
      </div>
    );
  }
}
