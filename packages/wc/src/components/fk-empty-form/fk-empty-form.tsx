import { Component, Host, h } from '@stencil/core';
import { fkT } from '../../i18n/i18n';

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
          <p class="fk-empty__title">{fkT('empty.title')}</p>
          <p class="fk-empty__hint">{fkT('empty.hint')}</p>
        </div>
      </Host>
    );
  }
}
