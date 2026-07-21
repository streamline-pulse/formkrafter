export interface DataSourceRequestOptions {
  headers?: Record<string, string>;
}

export interface DataSourceServiceDefaults {
  credentials?: "omit" | "same-origin" | "include";
  headers?: Record<string, string>;
}

export interface DataSourceService {
  fetchOptions(
    url: string,
    options?: DataSourceRequestOptions
  ): Promise<unknown[]>;
}

export class FetchDataSourceService implements DataSourceService {
  private cache = new Map<string, Promise<unknown[]>>();

  constructor(private readonly defaults: DataSourceServiceDefaults = {}) {}

  fetchOptions(
    url: string,
    options?: DataSourceRequestOptions
  ): Promise<unknown[]> {
    const headers = { ...this.defaults.headers, ...options?.headers };
    const init: Record<string, unknown> = {};
    if (Object.keys(headers).length) init.headers = headers;
    if (this.defaults.credentials) init.credentials = this.defaults.credentials;

    const key = `${url}|${JSON.stringify(init)}`;
    let pending = this.cache.get(key);

    if (!pending) {
      pending = fetch(url, Object.keys(init).length ? (init as never) : undefined)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Data source request failed (${response.status}): ${url}`);
          }
          return response.json();
        })
        .then((json: unknown) => (Array.isArray(json) ? json : []))
        .catch((error: unknown) => {
          this.cache.delete(key);
          throw error;
        });

      this.cache.set(key, pending);
    }

    return pending;
  }
}
