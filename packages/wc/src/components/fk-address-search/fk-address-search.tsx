import { Component, Element, Event, Prop, State, Watch, h } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';
import { fkT } from '../../i18n/i18n';

export interface AddressProperties {
  label: string;
  street?: string;
  city?: string;
  postcode?: string;
  country?: string;
  countryCode?: string;
  placeId?: string;
}

/** A geocoded address: GeoJSON Feature, geometry null when it was typed but not located. */
export interface AddressFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] } | null;
  properties: AddressProperties;
}

const NOMINATIM = 'https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q={q}';
const DEBOUNCE_MS = 400;

type NominatimRow = {
  place_id?: number | string;
  lat: string;
  lon: string;
  display_name: string;
  address?: Record<string, string>;
};

const round = (value: number) => Math.round(value * 1e6) / 1e6;

/** Reads one Nominatim `jsonv2` row; a custom provider must answer in that shape. */
const toFeature = (row: NominatimRow): AddressFeature => {
  const address = row.address ?? {};
  const street = [address.house_number, address.road ?? address.pedestrian ?? address.footway].filter(Boolean).join(' ');
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [round(Number(row.lon)), round(Number(row.lat))] },
    properties: {
      label: row.display_name,
      ...(street && { street }),
      ...((address.city ?? address.town ?? address.village ?? address.municipality) && {
        city: address.city ?? address.town ?? address.village ?? address.municipality,
      }),
      ...(address.postcode && { postcode: address.postcode }),
      ...(address.country && { country: address.country }),
      ...(address.country_code && { countryCode: address.country_code }),
      ...(row.place_id !== undefined && { placeId: String(row.place_id) }),
    },
  };
};

/**
 * An address search box: what is typed is looked up after a pause, the
 * matches are listed, a pick stores the normalised address with its point.
 * Text that is never picked stays as a label without geometry, so an address
 * the provider does not know is still accepted.
 */
@Component({
  tag: 'fk-address-search',
  styleUrl: 'fk-address-search.css',
  scoped: true,
})
export class FkAddressSearch {
  @Element() el!: HTMLElement;
  @Prop() value?: AddressFeature;
  /** Search URL with `{q}` for the query; Nominatim jsonv2 by default. */
  @Prop() searchUrl = NOMINATIM;
  /** Comma-separated ISO codes to restrict the search (Nominatim `countrycodes`). */
  @Prop() countryCodes?: string;
  @Prop() language?: string;
  @Prop() placeholder?: string;
  @Prop() disabled = false;
  @Prop() readOnly = false;
  @Prop() minChars = 3;

  @Event() addressChange!: EventEmitter<AddressFeature | undefined>;

  @State() query = '';
  @State() results: AddressFeature[] = [];
  @State() open = false;
  @State() loading = false;
  @State() failed = false;
  @State() index = 0;

  private timer?: ReturnType<typeof setTimeout>;
  private request = 0;
  private focused = false;

  componentWillLoad() {
    this.query = this.value?.properties.label ?? '';
  }

  @Watch('value')
  onValueChange(next: AddressFeature | undefined) {
    const label = next?.properties.label ?? '';
    if (!this.focused && label !== this.query) this.query = label;
  }

  private get locked(): boolean {
    return this.disabled || this.readOnly;
  }

  private buildUrl(query: string): string {
    let url = this.searchUrl.replace('{q}', encodeURIComponent(query));
    if (this.countryCodes) url += `${url.includes('?') ? '&' : '?'}countrycodes=${encodeURIComponent(this.countryCodes)}`;
    if (this.language) url += `${url.includes("?") ? "&" : "?"}accept-language=${encodeURIComponent(this.language)}`;
    return url;
  }

  private async search(query: string) {
    const id = ++this.request;
    this.loading = true;
    this.failed = false;
    try {
      const response = await fetch(this.buildUrl(query), { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(String(response.status));
      const rows = (await response.json()) as NominatimRow[];
      if (id !== this.request) return;
      this.results = Array.isArray(rows) ? rows.map(toFeature) : [];
      this.index = 0;
      this.open = true;
    } catch {
      if (id !== this.request) return;
      this.results = [];
      this.failed = true;
      this.open = true;
    } finally {
      if (id === this.request) this.loading = false;
    }
  }

  private onInput = (event: Event) => {
    const query = (event.target as HTMLInputElement).value;
    this.query = query;
    if (this.timer) clearTimeout(this.timer);
    // The typed text is the value until a match is picked.
    this.addressChange.emit(
      query.trim() ? { type: 'Feature', geometry: null, properties: { label: query } } : undefined
    );
    if (query.trim().length < this.minChars) {
      this.open = false;
      this.results = [];
      return;
    }
    this.timer = setTimeout(() => void this.search(query.trim()), DEBOUNCE_MS);
  };

  private pick(feature: AddressFeature) {
    this.query = feature.properties.label;
    this.open = false;
    this.results = [];
    this.addressChange.emit(feature);
  }

  private onKeyDown = (event: KeyboardEvent) => {
    if (!this.open || !this.results.length) return;
    if (event.key === 'ArrowDown') {
      this.index = (this.index + 1) % this.results.length;
      event.preventDefault();
    } else if (event.key === 'ArrowUp') {
      this.index = (this.index - 1 + this.results.length) % this.results.length;
      event.preventDefault();
    } else if (event.key === 'Enter') {
      this.pick(this.results[this.index]);
      event.preventDefault();
    } else if (event.key === 'Escape') {
      this.open = false;
    }
  };

  render() {
    const located = !!this.value?.geometry;
    return (
      <div class="fk-address">
        <input
          class="fk-field__input"
          type="text"
          autocomplete="off"
          value={this.query}
          placeholder={this.placeholder ?? fkT('address.search')}
          disabled={this.disabled}
          readOnly={this.readOnly}
          onInput={this.onInput}
          onKeyDown={this.onKeyDown}
          onFocus={() => {
            this.focused = true;
          }}
          onBlur={() => {
            this.focused = false;
            setTimeout(() => {
              this.open = false;
            }, 120);
          }}
        />
        {this.query && !this.locked ? (
          <span class={{ 'fk-address__status': true, 'fk-address__status--located': located }}>
            {this.loading ? fkT('address.searching') : located ? fkT('address.located') : fkT('address.notLocated')}
          </span>
        ) : null}
        {this.open && !this.locked ? (
          <div class="fk-address__list" role="listbox">
            {this.failed ? (
              <div class="fk-address__empty">{fkT('address.unavailable')}</div>
            ) : this.results.length === 0 ? (
              <div class="fk-address__empty">{fkT('address.noResult')}</div>
            ) : (
              this.results.map((feature, i) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={i === this.index ? 'true' : 'false'}
                  class={{ 'fk-address__item': true, 'fk-address__item--active': i === this.index }}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    this.pick(feature);
                  }}
                  onMouseEnter={() => {
                    this.index = i;
                  }}
                >
                  {feature.properties.label}
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>
    );
  }
}
