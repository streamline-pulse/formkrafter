import { Component, Element, Prop, State, Watch, h } from '@stencil/core';

@Component({
  tag: 'fk-tabs',
  styleUrl: 'fk-tabs.css',
  scoped: true,
})
export class FkTabs {
  @Element() host!: HTMLElement;

  @Prop() tabLabels: string[] = [];
  @Prop() editable = false;

  @State() active = 0;

  private bodyEl?: HTMLElement;

  @Watch('tabLabels')
  clampActive() {
    if (this.active > Math.max(this.tabLabels.length - 1, 0)) {
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
              onClick={() => (this.active = index)}
            >
              {label}
            </button>
          ))}
        </div>
        <div class="fk-tabs__body" ref={(element) => (this.bodyEl = element)}>
          <slot></slot>
        </div>
      </div>
    );
  }
}
