import { Component, Host, h } from '@stencil/core';
import { getBrickMoldsGroupedByCategory } from '../../registry/registry';

@Component({
  tag: 'fk-brick-list',
  styleUrl: 'fk-brick-list.css',
  scoped: true,
})
export class FkBrickList {
  render() {
    const grouped = getBrickMoldsGroupedByCategory();

    return (
      <Host>
        <div class="fk-palette">
          {Object.entries(grouped).map(([category, molds]) => (
            <section class="fk-palette__group" key={category}>
              <h4 class="fk-palette__category">{category}</h4>
              <div class="fk-palette__items">
                {molds.map((mold) => (
                  <fk-brick-mold-item
                    brickMold={mold}
                    key={`${mold.type}:${mold.id}`}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </Host>
    );
  }
}
