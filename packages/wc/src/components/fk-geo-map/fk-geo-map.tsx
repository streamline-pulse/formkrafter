import { Component, Element, Event, Prop, State, Watch, h } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';
import type * as Leaflet from 'leaflet';
import { fkT } from '../../i18n/i18n';

export type GeoPoint = { type: 'Point'; coordinates: [number, number] };
export type GeoPolygon = { type: 'Polygon'; coordinates: [number, number][][] };
export type GeoLine = { type: 'LineString'; coordinates: [number, number][] };
export type GeoGeometry = GeoPoint | GeoPolygon | GeoLine;
export type GeoMode = 'point' | 'polygon' | 'line';

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

  @Event() geoChange!: EventEmitter<GeoGeometry | undefined>;

  @State() failed = false;
  @State() vertexCount = 0;

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
      if (this.locked) return;
      if (this.mode === 'point') this.setVertices([event.latlng]);
      else this.setVertices([...this.vertices, event.latlng]);
    });
    this.map = map;
    this.draw(this.value);
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
      </div>
    );
  }
}
