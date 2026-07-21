import { Component, Host, State, h } from '@stencil/core';
import { getBrickMoldsGroupedByCategory } from '../../registry/registry';
import { fkT, fkTOr } from '../../i18n/i18n';

@Component({
  tag: 'fk-brick-list',
  styleUrl: 'fk-brick-list.css',
  scoped: true,
})
export class FkBrickList {
  @State() query = '';
  @State() collapsed: Record<string, boolean> = {};

  private toggle(category: string) {
    this.collapsed = {
      ...this.collapsed,
      [category]: !this.collapsed[category],
    };
  }

  render() {
    const grouped = getBrickMoldsGroupedByCategory();
    const query = this.query.trim().toLowerCase();

    const filtered = Object.entries(grouped)
      .map(([category, molds]) => ({
        category,
        molds: query
          ? molds.filter((mold) =>
              [
                mold.name,
                fkTOr(`brick.${mold.id}.name`, mold.name),
                mold.id,
                category,
                fkTOr(`category.${category}`, category),
              ].some((candidate) => candidate.toLowerCase().includes(query))
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
            placeholder={fkT('palette.search')}
            value={this.query}
            onInput={(event) =>
              (this.query = (event.target as HTMLInputElement).value)
            }
          />

          {filtered.map(({ category, molds }) => {
            const isCollapsed = !query && this.collapsed[category];

            return (
              <section class="fk-palette__group" key={category}>
                <button
                  type="button"
                  class="fk-palette__category"
                  onClick={() => this.toggle(category)}
                >
                  <span
                    class={{
                      'fk-palette__chevron': true,
                      'fk-palette__chevron--collapsed': isCollapsed,
                    }}
                  >
                    ▾
                  </span>
                  {fkTOr(`category.${category}`, category)}
                  <span class="fk-palette__count">{molds.length}</span>
                </button>
                {!isCollapsed ? (
                  <div class="fk-palette__items">
                    {molds.map((mold) => (
                      <fk-brick-mold-item
                        brickMold={mold}
                        key={`${mold.type}:${mold.id}`}
                      />
                    ))}
                  </div>
                ) : null}
              </section>
            );
          })}

          {filtered.length === 0 ? (
            <p class="fk-palette__empty">{fkT('palette.empty', { query: this.query })}</p>
          ) : null}
        </div>
      </Host>
    );
  }
}
