export interface DataSourceRequestOptions {
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

  fetchOptions(
    url: string,
    options?: DataSourceRequestOptions
  ): Promise<unknown[]> {
    const key = `${url}|${JSON.stringify(options?.headers ?? {})}`;
    let pending = this.cache.get(key);

    if (!pending) {
      pending = fetch(
        url,
        options?.headers ? { headers: options.headers } : undefined
      )
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
