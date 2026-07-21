import { Component, Element, Event, Prop, State, h } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { toBrickDropDetail } from '../../utils/drop';
import type { BrickDropDetail } from '../../utils/events';
import { fkT } from '../../i18n/i18n';

@Component({
  tag: 'fk-drop-area',
  styleUrl: 'fk-drop-area.css',
  scoped: true,
})
export class FkDropArea {
  @Element() host!: HTMLElement;

  @Prop() path!: string;

  @Event() brickDrop!: EventEmitter<BrickDropDetail>;

  @State() isOver = false;

  private cleanup?: () => void;

  componentDidLoad() {
    this.cleanup = dropTargetForElements({
      element: this.host,
      onDragEnter: () => (this.isOver = true),
      onDragLeave: () => (this.isOver = false),
      onDrop: ({ source, location }) => {
        this.isOver = false;

        if (location.current.dropTargets[0]?.element !== this.host) return;

        const detail = toBrickDropDetail(source.data, this.path);
        if (detail) this.brickDrop.emit(detail);
      },
    });
  }

  disconnectedCallback() {
    this.cleanup?.();
  }

  render() {
    return (
      <div class={{ 'fk-drop': true, 'fk-drop--over': this.isOver }}>
        <span class="fk-drop__hint">{fkT('drop.hint')}</span>
      </div>
    );
  }
}
