import { Component, Element, Prop, State, h } from '@stencil/core';
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import type { BrickMold } from '@streamline-pulse/formkrafter-core';

@Component({
  tag: 'fk-brick-mold-item',
  styleUrl: 'fk-brick-mold-item.css',
  scoped: true,
})
export class FkBrickMoldItem {
  @Element() host!: HTMLElement;

  @Prop() brickMold!: BrickMold;

  @State() isDragging = false;

  private cleanup?: () => void;

  componentDidLoad() {
    this.cleanup = draggable({
      element: this.host,
      getInitialData: () => ({
        kind: 'new-brick',
        moldType: this.brickMold.type,
        moldId: this.brickMold.id,
      }),
      onDragStart: () => (this.isDragging = true),
      onDrop: () => (this.isDragging = false),
    });
  }

  disconnectedCallback() {
    this.cleanup?.();
  }

  render() {
    return (
      <div class={{ 'fk-mold': true, 'fk-mold--dragging': this.isDragging }}>
        <span class="fk-mold__name">{this.brickMold.name}</span>
        {this.brickMold.category ? (
          <span class="fk-mold__category">{this.brickMold.category}</span>
        ) : null}
      </div>
    );
  }
}
