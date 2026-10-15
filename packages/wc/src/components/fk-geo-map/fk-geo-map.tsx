import { Component, Element, Event, Prop, State, Watch, h } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';
import type * as Leaflet from 'leaflet';
import { fkT } from '../../i18n/i18n';

export type GeoPoint = { type: 'Point'; coordinates: [number, number] };
export type GeoPolygon = { type: 'Polygon'; coordinates: [number, number][][] };
export type GeoLine = { type: 'LineString'; coordinates: [number, number][] };
export type GeoGeometry = GeoPoint | GeoPolygon | GeoLine;
export type GeoMode = 'point' | 'polygon' | 'line' | 'layer';

/** One zone of a reference layer, as the field stores it. */
export interface GeoZone {
  code: string;
  name: string;
}

type LayerFeature = { type: 'Feature'; geometry: unknown; properties?: Record<string, unknown> };
type LayerCollection = { type: 'FeatureCollection'; features: LayerFeature[] };

// Une couche de reference se charge une fois par URL pour toute la page.
const layerCache = new Map<string, Promise<LayerCollection>>();
const loadLayer = (url: string): Promise<LayerCollection> => {
  let pending = layerCache.get(url);
  if (!pending) {
    pending = fetch(url, { headers: { Accept: 'application/geo+json, application/json' } }).then(async (response) => {
      if (!response.ok) throw new Error(String(response.status));
      return (await response.json()) as LayerCollection;
    });
    pending.catch(() => layerCache.delete(url));
    layerCache.set(url, pending);
  }
  return pending;
};

const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const round = (value: number) => Math.round(value * 1e6) / 1e6;

/** Coordinates as GeoJSON wants them: [longitude, latitude]. */
const toCoordinates = (latLng: { lat: number; lng: number }): [number, number] => [round(latLng.lng), round(latLng.lat)];

/**
 * A Leaflet map that edits one GeoJSON geometry: a point, a polygon or a
 * line. Leaflet is loaded on first use so forms without a map stay light.
 * The value also stays editable without the map: a point has latitude and
 * longitude inputs, so the field works when tiles cannot load.
 */
@Component({
  tag: 'fk-geo-map',
  styleUrls: ['leaflet.css', 'fk-geo-map.css'],
})
export class FkGeoMap {
  @Element() el!: HTMLElement;

  @Prop() value?: GeoGeometry;
  @Prop() mode: GeoMode = 'point';
  /** Initial view as [latitude, longitude], used when there is no value yet. */
  @Prop() center?: [number, number];
  @Prop() zoom = 6;
  @Prop() tileUrl = OSM_TILES;
  @Prop() attribution = OSM_ATTRIBUTION;
  @Prop() height = 320;
  @Prop() disabled = false;
  @Prop() readOnly = false;
  /** Show latitude and longitude inputs under a point map. */
  @Prop() manual = true;
  /** Layer mode: GeoJSON FeatureCollection to pick zones from. */
  @Prop() layerUrl?: string;
  @Prop() layerCodeProperty = 'code';
  @Prop() layerNameProperty = 'name';
  /** Layer mode: codes of the selected zones. */
  @Prop() selected: string[] = [];
  @Prop() multiple = false;

  @Event() geoChange!: EventEmitter<GeoGeometry | undefined>;
  /** Layer mode: the selected zones, in selection order. */
  @Event() layerChange!: EventEmitter<GeoZone[]>;

  @State() failed = false;
  @State() vertexCount = 0;
  @State() zones: GeoZone[] = [];
  @State() layerFailed = false;

  private layer?: Leaflet.GeoJSON;
  private layerData?: LayerCollection;
  private selectEl?: HTMLSelectElement;

  private map?: Leaflet.Map;
  private L?: typeof Leaflet;
  private container?: HTMLDivElement;
  private shapes: Leaflet.Layer[] = [];
  private vertices: Leaflet.LatLng[] = [];
  private lastEmitted = '';
  private observer?: ResizeObserver;

  private get locked(): boolean {
    return this.disabled || this.readOnly;
  }

  async componentDidLoad() {
    if (this.mode === 'layer') void this.fetchLayer();
    try {
      const module = await import('leaflet');
      this.L = (module as { default?: typeof Leaflet }).default ?? (module as unknown as typeof Leaflet);
    } catch {
      this.failed = true;
      return;
    }
    if (!this.container) return;
    this.initMap();
  }

  disconnectedCallback() {
    this.observer?.disconnect();
    this.map?.remove();
    this.map = undefined;
  }

  @Watch('value')
  onValueChange(next: GeoGeometry | undefined) {
    if (JSON.stringify(next ?? null) === this.lastEmitted) return;
    this.draw(next);
  }

  @Watch('disabled')
  @Watch('readOnly')
  onLockChange() {
    this.draw(this.value);
    this.restyleLayer();
  }

  @Watch('selected')
  onSelectedChange() {
    this.restyleLayer();
  }

  @Watch('layerUrl')
  onLayerUrlChange() {
    void this.fetchLayer();
  }

  private initMap() {
    const L = this.L!;
    const container = this.container!;
    const map = L.map(container, { attributionControl: true, zoomControl: !this.locked });
    L.tileLayer(this.tileUrl, { attribution: this.attribution, maxZoom: 19 }).addTo(map);
    map.setView(this.center ?? [0, 0], this.center ? this.zoom : 2);
    if (this.locked) {
      map.dragging.disable();
      map.scrollWheelZoom.disable();
    }
    map.on('click', (event: Leaflet.LeafletMouseEvent) => {
      if (this.locked || this.mode === 'layer') return;
      if (this.mode === 'point') this.setVertices([event.latlng]);
      else this.setVertices([...this.vertices, event.latlng]);
    });
    this.map = map;
    this.draw(this.value);
    this.drawLayer();
    // Hidden at mount (tab, stepper step): size up once visible.
    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(() => map.invalidateSize());
      this.observer.observe(container);
    }
    setTimeout(() => map.invalidateSize(), 50);
  }

  /** Reads the value into vertices and draws it, without emitting. */
  private draw(value: GeoGeometry | undefined) {
    const L = this.L;
    const map = this.map;
    if (!L || !map) {
      this.vertexCount = this.countVertices(value);
      return;
    }
    const vertices: Leaflet.LatLng[] = [];
    if (value?.type === 'Point') vertices.push(L.latLng(value.coordinates[1], value.coordinates[0]));
    if (value?.type === 'LineString') for (const [lng, lat] of value.coordinates) vertices.push(L.latLng(lat, lng));
    if (value?.type === 'Polygon') {
      const ring = value.coordinates[0] ?? [];
      const open = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1] ? ring.slice(0, -1) : ring;
      for (const [lng, lat] of open) vertices.push(L.latLng(lat, lng));
    }
    this.vertices = vertices;
    this.vertexCount = vertices.length;
    this.render_shapes();
    if (vertices.length === 1) map.setView(vertices[0], Math.max(map.getZoom(), this.zoom));
    else if (vertices.length > 1) map.fitBounds(L.latLngBounds(vertices), { padding: [24, 24] });
  }

  private countVertices(value: GeoGeometry | undefined): number {
    if (!value) return 0;
    if (value.type === 'Point') return 1;
    if (value.type === 'LineString') return value.coordinates.length;
    return Math.max((value.coordinates[0]?.length ?? 1) - 1, 0);
  }

  private render_shapes() {
    const L = this.L;
    const map = this.map;
    if (!L || !map) return;
    for (const shape of this.shapes) shape.remove();
    this.shapes = [];
    const vertices = this.vertices;
    if (this.mode === 'polygon' && vertices.length >= 3)
      this.shapes.push(L.polygon(vertices, { className: 'fk-geo__shape' }).addTo(map));
    if (this.mode === 'line' && vertices.length >= 2)
      this.shapes.push(L.polyline(vertices, { className: 'fk-geo__shape' }).addTo(map));
    vertices.forEach((latLng, index) => {
      const marker = L.marker(latLng, {
        draggable: !this.locked,
        icon: L.divIcon({ className: 'fk-geo__marker', iconSize: [14, 14], iconAnchor: [7, 7] }),
      }).addTo(map);
      marker.on('dragend', () => {
        const next = [...this.vertices];
        next[index] = marker.getLatLng();
        this.setVertices(next);
      });
      if (this.mode !== 'point')
        marker.on('contextmenu', () => {
          if (this.locked) return;
          this.setVertices(this.vertices.filter((_, i) => i !== index));
        });
      this.shapes.push(marker);
    });
  }

  private setVertices(vertices: Leaflet.LatLng[]) {
    this.vertices = vertices;
    this.vertexCount = vertices.length;
    this.render_shapes();
    this.emit();
  }

  private geometry(): GeoGeometry | undefined {
    const vertices = this.vertices;
    if (this.mode === 'point') return vertices[0] ? { type: 'Point', coordinates: toCoordinates(vertices[0]) } : undefined;
    if (this.mode === 'line')
      return vertices.length >= 2 ? { type: 'LineString', coordinates: vertices.map(toCoordinates) } : undefined;
    if (vertices.length < 3) return undefined;
    const ring = vertices.map(toCoordinates);
    return { type: 'Polygon', coordinates: [[...ring, ring[0]]] };
  }

  private emit() {
    const next = this.geometry();
    this.lastEmitted = JSON.stringify(next ?? null);
    this.geoChange.emit(next);
  }

  private clear = () => {
    if (this.locked) return;
    this.setVertices([]);
  };

  /** Manual latitude / longitude edit of a point, map or not. Emptying either empties the point. */
  private setManual(axis: 'lat' | 'lng', raw: string) {
    if (this.locked) return;
    if (raw.trim() === '') {
      this.vertices = [];
      this.vertexCount = 0;
      this.render_shapes();
      this.emit();
      return;
    }
    const current = this.value?.type === 'Point' ? this.value.coordinates : undefined;
    const lat = axis === 'lat' ? Number(raw) : (current?.[1] ?? NaN);
    const lng = axis === 'lng' ? Number(raw) : (current?.[0] ?? NaN);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;
    const point = this.L ? this.L.latLng(lat, lng) : ({ lat, lng } as Leaflet.LatLng);
    this.vertices = [point];
    this.vertexCount = 1;
    this.render_shapes();
    if (this.map) this.map.setView(point, Math.max(this.map.getZoom(), this.zoom));
    this.emit();
  }

  // Les options arrivent apres le premier rendu : la valeur du select se pose a la main.
  componentDidRender() {
    if (this.selectEl && this.mode === 'layer') this.selectEl.value = this.selected[0] ?? '';
  }

  private zoneOf(feature: LayerFeature): GeoZone | null {
    const properties = feature.properties ?? {};
    const code = properties[this.layerCodeProperty];
    const name = properties[this.layerNameProperty];
    if (code === undefined || code === null || code === '') return null;
    return { code: String(code), name: name === undefined || name === null ? String(code) : String(name) };
  }

  private async fetchLayer() {
    this.layerFailed = false;
    if (!this.layerUrl) {
      this.layerData = undefined;
      this.zones = [];
      this.drawLayer();
      return;
    }
    try {
      const data = await loadLayer(this.layerUrl);
      this.layerData = data;
      this.zones = (data.features ?? [])
        .map((feature) => this.zoneOf(feature))
        .filter((zone): zone is GeoZone => zone !== null)
        .sort((a, b) => a.name.localeCompare(b.name));
      this.drawLayer();
    } catch {
      this.layerFailed = true;
    }
  }

  private layerStyle(code: string | null): Leaflet.PathOptions {
    const picked = code !== null && this.selected.includes(code);
    return {
      className: picked ? 'fk-geo__zone fk-geo__zone--selected' : 'fk-geo__zone',
      weight: picked ? 2 : 1,
      fillOpacity: picked ? 0.45 : 0.1,
    };
  }

  private drawLayer() {
    const L = this.L;
    const map = this.map;
    if (!L || !map || this.mode !== 'layer') return;
    this.layer?.remove();
    this.layer = undefined;
    if (!this.layerData) return;
    const layer = L.geoJSON(this.layerData as never, {
      style: (feature) => this.layerStyle(feature ? (this.zoneOf(feature as LayerFeature)?.code ?? null) : null),
      onEachFeature: (feature, shape) => {
        const zone = this.zoneOf(feature as LayerFeature);
        if (!zone) return;
        shape.bindTooltip(zone.name, { sticky: true });
        shape.on('click', () => {
          if (this.locked) return;
          this.toggleZone(zone);
        });
      },
    }).addTo(map);
    this.layer = layer;
    const bounds = layer.getBounds();
    if (bounds.isValid() && !this.selected.length) map.fitBounds(bounds, { padding: [16, 16] });
    else if (bounds.isValid() && this.selected.length) map.fitBounds(bounds, { padding: [16, 16] });
  }

  private restyleLayer() {
    const layer = this.layer;
    if (!layer) return;
    layer.setStyle((feature) => this.layerStyle(feature ? (this.zoneOf(feature as LayerFeature)?.code ?? null) : null));
  }

  private toggleZone(zone: GeoZone) {
    const picked = this.selected.includes(zone.code);
    const codes = this.multiple
      ? picked
        ? this.selected.filter((code) => code !== zone.code)
        : [...this.selected, zone.code]
      : picked
        ? []
        : [zone.code];
    this.emitZones(codes);
  }

  private emitZones(codes: string[]) {
    const byCode = new Map(this.zones.map((zone) => [zone.code, zone]));
    this.layerChange.emit(codes.map((code) => byCode.get(code) ?? { code, name: code }));
  }

  private renderLayerBar() {
    const selectedZones = this.selected.map((code) => this.zones.find((zone) => zone.code === code) ?? { code, name: code });
    return (
      <div class="fk-geo__bar">
        {this.layerFailed ? (
          <span class="fk-geo__summary">{fkT('layer.unavailable')}</span>
        ) : this.multiple ? (
          <span class="fk-geo__chips">
            {selectedZones.length === 0 ? (
              <span class="fk-geo__summary">{fkT('layer.pickMany')}</span>
            ) : (
              selectedZones.map((zone) => (
                <span class="fk-geo__chip">
                  {zone.name}
                  {!this.locked ? (
                    <button type="button" class="fk-geo__chip-remove" aria-label={fkT('geo.clear')} onClick={() => this.toggleZone(zone)}>
                      ×
                    </button>
                  ) : null}
                </span>
              ))
            )}
          </span>
        ) : (
          <select
            class="fk-field__input fk-geo__select"
            ref={(element) => {
              this.selectEl = element as HTMLSelectElement;
            }}
            disabled={this.locked}
            onChange={(event) => {
              const code = (event.target as HTMLSelectElement).value;
              this.emitZones(code ? [code] : []);
            }}
          >
            <option value="" selected={!this.selected.length}>
              {fkT('layer.pick')}
            </option>
            {this.zones.map((zone) => (
              <option value={zone.code} selected={this.selected[0] === zone.code}>
                {zone.name}
              </option>
            ))}
          </select>
        )}
        {!this.locked && !this.layerFailed ? <span class="fk-geo__hint">{fkT('layer.hint')}</span> : null}
      </div>
    );
  }

  render() {
    const point = this.value?.type === 'Point' ? this.value.coordinates : undefined;
    const hint = this.mode === 'point' ? fkT('geo.hintPoint') : fkT('geo.hintArea');
    return (
      <div class={{ 'fk-geo': true, 'fk-geo--locked': this.locked }}>
        <div
          class="fk-geo__map"
          style={{ height: `${this.height}px` }}
          ref={(element) => {
            this.container = element as HTMLDivElement;
          }}
        >
          {this.failed ? <div class="fk-geo__unavailable">{fkT('geo.unavailable')}</div> : null}
        </div>
        {this.mode === 'layer' ? this.renderLayerBar() : (
        <div class="fk-geo__bar">
          {this.mode === 'point' && this.manual ? (
            <div class="fk-geo__manual">
              <label class="fk-geo__coord">
                <span>{fkT('geo.latitude')}</span>
                <input
                  class="fk-field__input"
                  type="number"
                  step="any"
                  min="-90"
                  max="90"
                  value={point ? String(point[1]) : ''}
                  disabled={this.disabled}
                  readOnly={this.readOnly}
                  onChange={(event) => this.setManual('lat', (event.target as HTMLInputElement).value)}
                />
              </label>
              <label class="fk-geo__coord">
                <span>{fkT('geo.longitude')}</span>
                <input
                  class="fk-field__input"
                  type="number"
                  step="any"
                  min="-180"
                  max="180"
                  value={point ? String(point[0]) : ''}
                  disabled={this.disabled}
                  readOnly={this.readOnly}
                  onChange={(event) => this.setManual('lng', (event.target as HTMLInputElement).value)}
                />
              </label>
            </div>
          ) : (
            <span class="fk-geo__summary">
              {this.vertexCount} {fkT('geo.points')}
            </span>
          )}
          {!this.locked ? (
            <span class="fk-geo__actions">
              <span class="fk-geo__hint">{hint}</span>
              {this.vertexCount > 0 ? (
                <button type="button" class="fk-geo__clear" onClick={this.clear}>
                  {fkT('geo.clear')}
                </button>
              ) : null}
            </span>
          ) : null}
        </div>
        )}
      </div>
    );
  }
}
