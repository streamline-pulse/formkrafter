import type { BrickSpec } from "../utils/brick-spec";

export interface SpecSourceService {
  fetchSpec(ref: string): Promise<BrickSpec>;
}

export interface FetchSpecSourceDefaults {
  baseUrl?: string;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
  fetch?: typeof fetch;
}

export class FetchSpecSourceService implements SpecSourceService {
  private cache = new Map<string, Promise<BrickSpec>>();

  constructor(private readonly defaults: FetchSpecSourceDefaults = {}) {}

  private resolveUrl(ref: string): string {
    if (/^https?:\/\//.test(ref) || !this.defaults.baseUrl) return ref;
    return `${this.defaults.baseUrl.replace(/\/$/, "")}/${ref.replace(/^\//, "")}`;
  }

  fetchSpec(ref: string): Promise<BrickSpec> {
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
          throw new Error(`Failed to load spec "${ref}" (${response.status})`);
        }
        return (await response.json()) as BrickSpec;
      });

      pending.catch(() => this.cache.delete(url));
      this.cache.set(url, pending);
    }

    return pending;
  }
}
