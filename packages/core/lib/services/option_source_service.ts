export interface OptionSourceService {
  fetchOptions(ref: string): Promise<unknown>;
}

export interface FetchOptionSourceDefaults {
  baseUrl?: string;
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
}
