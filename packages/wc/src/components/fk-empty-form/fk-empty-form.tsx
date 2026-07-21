import { Component, Host, h } from '@stencil/core';

@Component({
  tag: 'fk-empty-form',
  styleUrl: 'fk-empty-form.css',
  scoped: true,
})
export class FkEmptyForm {
  render() {
    return (
      <Host>
        <div class="fk-empty">
          <p class="fk-empty__title">Your form is empty</p>
          <p class="fk-empty__hint">Drag a brick from the palette to get started</p>
        </div>
      </Host>
    );
  }
}
