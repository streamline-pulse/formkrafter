import { Component, Host, State, h } from '@stencil/core';
import { getBrickMoldsGroupedByCategory } from '../../registry/registry';

@Component({
  tag: 'fk-brick-list',
  styleUrl: 'fk-brick-list.css',
  scoped: true,
})
export class FkBrickList {
  @State() query = '';

  render() {
    const grouped = getBrickMoldsGroupedByCategory();
    const query = this.query.trim().toLowerCase();

    const filtered = Object.entries(grouped)
      .map(([category, molds]) => ({
        category,
        molds: query
          ? molds.filter(
              (mold) =>
                mold.name.toLowerCase().includes(query) ||
                mold.id.toLowerCase().includes(query) ||
                category.toLowerCase().includes(query)
            )
          : molds,
      }))
      .filter((group) => group.molds.length > 0);

    return (
      <Host>
        <div class="fk-palette">
          <input
            class="fk-palette__search"
            type="search"
            placeholder="Search bricks…"
            value={this.query}
            onInput={(event) =>
              (this.query = (event.target as HTMLInputElement).value)
            }
          />

          {filtered.map(({ category, molds }) => (
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

          {filtered.length === 0 ? (
            <p class="fk-palette__empty">No brick matches “{this.query}”</p>
          ) : null}
        </div>
      </Host>
    );
  }
}
