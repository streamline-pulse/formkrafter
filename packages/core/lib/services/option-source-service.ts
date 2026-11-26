/** A catalog the host offers to select / multi-select fields (shown in the builder). */
export interface OptionCatalogEntry {
  /** What to put in `optionsRef` (filters may be appended: `towns?region={{data.region}}`). */
  ref: string;
  label: string;
  description?: string;
  /** Query parameters the catalog accepts, for dependent lists. */
  filters?: string[];
}

export interface OptionSourceService {
  fetchOptions(ref: string): Promise<unknown>;
  /** Optional: the catalogs available, so the builder can suggest refs. */
  listCatalogs?(): Promise<OptionCatalogEntry[]>;
}

export interface FetchOptionSourceDefaults {
  baseUrl?: string;
  /** Where to list the catalogs (default: `baseUrl`). The response is an array, or `{ data: [...] }`, of `{ ref | value, name | label, description?, filters? }`. */
  catalogsUrl?: string;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
  fetch?: typeof fetch;
}

export class FetchOptionSourceService implements OptionSourceService {
  private cache = new Map<string, Promise<unknown>>();

  constructor(private readonly defaults: FetchOptionSourceDefaults = {}) {}

  private resolveUrl(ref: string): string {
    if (/^https?:\/\//.test(ref) || !this.defaults.baseUrl) return ref;
    return `${this.defaults.baseUrl.replace(/\/$/, "")}/${ref.replace(/^\//, "")}`;
  }

  fetchOptions(ref: string): Promise<unknown> {
    const url = this.resolveUrl(ref);

    let pending = this.cache.get(url);
    if (!pending) {
      const fetchImplementation =
        this.defaults.fetch ?? globalThis.fetch.bind(globalThis);

      pending = fetchImplementation(url, {
        headers: this.defaults.headers,
        credentials: this.defaults.credentials,
      }).then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load options "${ref}" (${response.status})`);
        }
        return (await response.json()) as unknown;
      });

      pending.catch(() => this.cache.delete(url));
      this.cache.set(url, pending);
    }

    return pending;
  }

  private catalogs?: Promise<OptionCatalogEntry[]>;

  listCatalogs(): Promise<OptionCatalogEntry[]> {
    const url = this.defaults.catalogsUrl ?? this.defaults.baseUrl;
    if (!url) return Promise.resolve([]);
    if (!this.catalogs) {
      const fetchImplementation = this.defaults.fetch ?? globalThis.fetch.bind(globalThis);
      this.catalogs = fetchImplementation(url, { headers: this.defaults.headers, credentials: this.defaults.credentials })
        .then(async (response) => {
          if (!response.ok) throw new Error(`Failed to list option catalogs (${response.status})`);
          const body = (await response.json()) as unknown;
          const rows = Array.isArray(body) ? body : Array.isArray((body as { data?: unknown })?.data) ? (body as { data: unknown[] }).data : [];
          return rows.flatMap((row) => {
            const entry = (row ?? {}) as Record<string, unknown>;
            const ref = String(entry.ref ?? entry.value ?? '');
            if (!ref) return [];
            return [
              {
                ref,
                label: String(entry.name ?? entry.label ?? ref),
                ...(typeof entry.description === 'string' && { description: entry.description }),
                ...(Array.isArray(entry.filters) && { filters: entry.filters.map(String) }),
              },
            ];
          });
        });
      this.catalogs.catch(() => (this.catalogs = undefined));
    }
    return this.catalogs;
  }
}
