import { Component, Element, Event, Prop, State, h } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';
import {
  draggable,
  dropTargetForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { toBrickDropDetail } from '../../utils/drop';
import type { BrickDropDetail, BrickPathDetail } from '../../utils/events';
import { fkT } from '../../i18n/i18n';

@Component({
  tag: 'fk-brick-actions',
  styleUrl: 'fk-brick-actions.css',
  scoped: true,
})
export class FkBrickActions {
  @Element() host!: HTMLElement;

  @Prop() path!: string;
  @Prop() selected = false;

  @Event() brickRemove!: EventEmitter<BrickPathDetail>;
  @Event() brickDuplicate!: EventEmitter<BrickPathDetail>;
  @Event() brickDrop!: EventEmitter<BrickDropDetail>;
  @Event() brickSelect!: EventEmitter<BrickPathDetail>;

  @State() isDragging = false;
  @State() isDropTarget = false;

  private handleEl?: HTMLElement;
  private cleanups: Array<() => void> = [];

  componentDidLoad() {
    if (this.handleEl) {
      this.cleanups.push(
        draggable({
          element: this.handleEl,
          getInitialData: () => ({ kind: 'move-brick', path: this.path }),
          onDragStart: () => (this.isDragging = true),
          onDrop: () => (this.isDragging = false),
        })
      );
    }

    this.cleanups.push(
      dropTargetForElements({
        element: this.host,
        onDrag: ({ location }) =>
          (this.isDropTarget =
            location.current.dropTargets[0]?.element === this.host),
        onDragLeave: () => (this.isDropTarget = false),
        onDrop: ({ source, location }) => {
          this.isDropTarget = false;

          if (location.current.dropTargets[0]?.element !== this.host) return;

          const segments = this.path.split('.');
          const detail = toBrickDropDetail(
            source.data,
            segments.slice(0, -1).join('.'),
            Number(segments[segments.length - 1])
          );
          if (detail) this.brickDrop.emit(detail);
        },
      })
    );
  }

  disconnectedCallback() {
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
  }

  render() {
    return (
      <div
        class={{
          'fk-actions': true,
          'fk-actions--dragging': this.isDragging,
          'fk-actions--drop-before': this.isDropTarget,
          'fk-actions--selected': this.selected,
        }}
        onClick={(event) => {
          event.stopPropagation();
          this.brickSelect.emit({ path: this.path });
        }}
      >
        <div class="fk-actions__toolbar">
          <button
            type="button"
            class="fk-actions__button fk-actions__handle"
            ref={(el) => (this.handleEl = el)}
            title={fkT('actions.move')}
          >
            ⠿
          </button>
          <button
            type="button"
            class="fk-actions__button"
            title={fkT('actions.duplicate')}
            onClick={(event) => {
              event.stopPropagation();
              this.brickDuplicate.emit({ path: this.path });
            }}
          >
            ⧉
          </button>
          <button
            type="button"
            class="fk-actions__button fk-actions__button--danger"
            title={fkT('actions.delete')}
            onClick={(event) => {
              event.stopPropagation();
              this.brickRemove.emit({ path: this.path });
            }}
          >
            ✕
          </button>
        </div>
        <slot></slot>
      </div>
    );
  }
}
