import { Component, Element, Event, Prop, State, Watch, h } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';
import {
  iterateSchemaBricks,
  validateBrickSpecDataDetailed,
} from '@streamline-pulse/formkrafter-core';
import type { BrickSpec } from '@streamline-pulse/formkrafter-core';
import { fkT } from '../../i18n/i18n';

@Component({
  tag: 'fk-stepper',
  styleUrl: 'fk-stepper.css',
  scoped: true,
})
export class FkStepper {
  @Element() host!: HTMLElement;

  @Prop() stepLabels: string[] = [];
  @Prop() editable = false;
  @Prop() spec?: BrickSpec;
  @Prop() dataMap?: Record<string, unknown>;
  @Prop() locale?: string;

  @Event() stepTouch!: EventEmitter<{ keys: string[] }>;
  @Event() stepperSubmit!: EventEmitter<void>;

  @State() active = 0;

  private stepCache?: { source: BrickSpec; specs: BrickSpec[] };

  @Watch('stepLabels')
  clampActive() {
    if (this.active > Math.max(this.stepLabels.length - 1, 0)) {
      this.active = 0;
    }
  }

  componentDidRender() {
    const body = this.host.querySelector('.fk-stepper__body');
    if (!body) return;

    Array.from(body.children).forEach((child, index) => {
      const element = child as HTMLElement;
      if (this.editable) element.style.removeProperty('display');
      else element.style.display = index === this.active ? '' : 'none';
    });
  }

  private config(name: string, fallback: boolean): boolean {
    const raw = this.spec?.configs?.[name];
    return typeof raw === 'boolean' ? raw : fallback;
  }

  private stepSpec(index: number): BrickSpec | undefined {
    const child = this.spec?.children?.[index];
    if (!child || !this.spec) return undefined;

    if (this.stepCache?.source !== this.spec) {
      this.stepCache = { source: this.spec, specs: [] };
    }
    if (!this.stepCache.specs[index]) {
      this.stepCache.specs[index] = {
        type: 'panel',
        id: 'step',
        name: 'Step',
        configs: { key: `step_${index}` },
        children: [child],
      };
    }

    return this.stepCache.specs[index];
  }

  private stepKeys(index: number): string[] {
    const child = this.spec?.children?.[index];
    if (!child) return [];

    const keys: string[] = [];
    for (const brick of iterateSchemaBricks(child)) {
      if (brick.configs?.key) keys.push(brick.configs.key);
    }

    return keys;
  }

  private stepValid(index: number): boolean {
    const stepSpec = this.stepSpec(index);
    if (!stepSpec) return true;

    const present = Object.fromEntries(
      Object.entries(this.dataMap ?? {}).filter(
        ([, value]) => value !== '' && value !== null && value !== undefined
      )
    );

    return validateBrickSpecDataDetailed(stepSpec, present, this.locale).valid;
  }

  private next = (event: MouseEvent) => {
    event.preventDefault();

    if (this.config('validateSteps', false) && !this.stepValid(this.active)) {
      this.stepTouch.emit({ keys: this.stepKeys(this.active) });
      return;
    }

    this.active = Math.min(this.active + 1, this.stepLabels.length - 1);
  };

  private back = (event: MouseEvent) => {
    event.preventDefault();
    this.active = Math.max(this.active - 1, 0);
  };

  private submit = (event: MouseEvent) => {
    event.preventDefault();

    if (this.config('validateSteps', false) && !this.stepValid(this.active)) {
      this.stepTouch.emit({ keys: this.stepKeys(this.active) });
      return;
    }

    this.stepperSubmit.emit();
  };

  private goToStep(index: number) {
    if (this.editable || index <= this.active) {
      this.active = index;
      return;
    }

    if (!this.config('allowStepClick', true)) return;

    if (this.config('validateSteps', false)) {
      for (let i = this.active; i < index; i++) {
        if (!this.stepValid(i)) {
          this.active = i;
          this.stepTouch.emit({ keys: this.stepKeys(i) });
          return;
        }
      }
    }

    this.active = index;
  }

  render() {
    const lastStep = Math.max(this.stepLabels.length - 1, 0);
    const showSubmit =
      !this.editable && this.config('showSubmit', false) && this.active === lastStep;

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
              onClick={() => this.goToStep(index)}
            >
              <span class="fk-stepper__index">{index + 1}</span>
              <span class="fk-stepper__label">{label}</span>
            </li>
          ))}
        </ol>

        <div class="fk-stepper__body">
          <slot></slot>
        </div>

        {!this.editable && this.stepLabels.length > 1 ? (
          <div class="fk-stepper__actions">
            <button
              type="button"
              class="fk-stepper__button"
              disabled={this.active === 0}
              onClick={this.back}
            >
              {fkT('stepper.back')}
            </button>
            {this.active < lastStep ? (
              <button
                type="button"
                class="fk-stepper__button fk-stepper__button--primary"
                onClick={this.next}
              >
                {fkT('stepper.next')}
              </button>
            ) : null}
            {showSubmit ? (
              <button
                type="button"
                class="fk-stepper__button fk-stepper__button--primary"
                onClick={this.submit}
              >
                {fkT('stepper.submit')}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }
}
