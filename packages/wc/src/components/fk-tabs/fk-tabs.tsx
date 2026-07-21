import { Component, Element, Event, Prop, State, Watch, h } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';
import {
  iterateSchemaBricks,
  validateBrickSpecDataDetailed,
} from '@streamline-pulse/formkrafter-core';
import type { BrickSpec } from '@streamline-pulse/formkrafter-core';

@Component({
  tag: 'fk-tabs',
  styleUrl: 'fk-tabs.css',
  scoped: true,
})
export class FkTabs {
  @Element() host!: HTMLElement;

  @Prop() tabLabels: string[] = [];
  @Prop() editable = false;
  @Prop() spec?: BrickSpec;
  @Prop() dataMap?: Record<string, unknown>;
  @Prop() locale?: string;

  @Event() stepTouch!: EventEmitter<{ keys: string[] }>;

  @State() active = 0;

  private tabCache?: { source: BrickSpec; specs: BrickSpec[] };

  @Watch('tabLabels')
  clampActive() {
    if (this.active > Math.max(this.tabLabels.length - 1, 0)) {
      this.active = 0;
    }
  }

  componentDidRender() {
    const body = this.host.querySelector('.fk-tabs__body');
    if (!body) return;

    Array.from(body.children).forEach((child, index) => {
      const element = child as HTMLElement;
      if (this.editable) element.style.removeProperty('display');
      else element.style.display = index === this.active ? '' : 'none';
    });
  }

  private validateTabs(): boolean {
    return this.spec?.configs?.validateTabs === true;
  }

  private tabSpec(index: number): BrickSpec | undefined {
    const child = this.spec?.children?.[index];
    if (!child || !this.spec) return undefined;

    if (this.tabCache?.source !== this.spec) {
      this.tabCache = { source: this.spec, specs: [] };
    }
    if (!this.tabCache.specs[index]) {
      this.tabCache.specs[index] = {
        type: 'panel',
        id: 'tab',
        name: 'Tab',
        configs: { key: `tab_${index}` },
        children: [child],
      };
    }

    return this.tabCache.specs[index];
  }

  private tabKeys(index: number): string[] {
    const child = this.spec?.children?.[index];
    if (!child) return [];

    const keys: string[] = [];
    for (const brick of iterateSchemaBricks(child)) {
      if (brick.configs?.key) keys.push(brick.configs.key);
    }

    return keys;
  }

  private tabValid(index: number): boolean {
    const tabSpec = this.tabSpec(index);
    if (!tabSpec) return true;

    const present = Object.fromEntries(
      Object.entries(this.dataMap ?? {}).filter(
        ([, value]) => value !== '' && value !== null && value !== undefined
      )
    );

    return validateBrickSpecDataDetailed(tabSpec, present, this.locale).valid;
  }

  private goToTab(index: number) {
    if (index === this.active) return;

    if (!this.editable && this.validateTabs() && !this.tabValid(this.active)) {
      this.stepTouch.emit({ keys: this.tabKeys(this.active) });
      return;
    }

    this.active = index;
  }

  render() {
    return (
      <div class="fk-tabs">
        <div class="fk-tabs__nav" role="tablist">
          {this.tabLabels.map((label, index) => (
            <button
              key={`${index}-${label}`}
              type="button"
              role="tab"
              class={{
                'fk-tabs__tab': true,
                'fk-tabs__tab--active': index === this.active,
              }}
              onClick={(event) => {
                event.preventDefault();
                this.goToTab(index);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div class="fk-tabs__body">
          <slot></slot>
        </div>
      </div>
    );
  }
}
