export interface DataSourceService {
  fetchOptions(url: string): Promise<unknown[]>;
}

export class FetchDataSourceService implements DataSourceService {
  private cache = new Map<string, Promise<unknown[]>>();

  fetchOptions(url: string): Promise<unknown[]> {
    let pending = this.cache.get(url);

    if (!pending) {
      pending = fetch(url)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Data source request failed (${response.status}): ${url}`);
          }
          return response.json();
        })
        .then((json: unknown) => (Array.isArray(json) ? json : []))
        .catch((error: unknown) => {
          this.cache.delete(url);
          throw error;
        });

      this.cache.set(url, pending);
    }

    return pending;
  }
}
