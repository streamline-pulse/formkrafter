import { Component, Host, h } from '@stencil/core';

@Component({
  tag: 'fk-brick-not-found',
  styleUrl: 'fk-brick-not-found.css',
  scoped: true,
})
export class FkBrickNotFound {
  render() {
    return (
      <Host>
        <p class="fk-not-found">
          Brick <slot></slot> not found
        </p>
      </Host>
    );
  }
}
