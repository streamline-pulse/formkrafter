import { resolvePath } from "../utils/remote";

export interface DataSourceRequestOptions {
  headers?: Record<string, string>;
  path?: string;
}

function optionsFromPayload(
  json: unknown,
  url: string,
  path?: string
): unknown[] {
  if (path) {
    const picked =
      json !== null && typeof json === "object"
        ? resolvePath(json as Record<string, unknown>, path)
        : undefined;

    if (!Array.isArray(picked)) {
      throw new Error(
        `Data source has no array at "${path}": ${url}`
      );
    }
    return picked;
  }

  if (Array.isArray(json)) return json;

  if (json !== null && typeof json === "object") {
    const envelope = (json as Record<string, unknown>).data;
    if (Array.isArray(envelope)) return envelope;
  }

  throw new Error(`Data source did not return an array: ${url}`);
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

    const key = `${url}|${JSON.stringify(init)}|${options?.path ?? ""}`;
    let pending = this.cache.get(key);

    if (!pending) {
      pending = fetch(url, Object.keys(init).length ? (init as never) : undefined)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Data source request failed (${response.status}): ${url}`);
          }
          return response.json();
        })
        // Silently coercing an unusable payload to [] once hid a
        // deprecated-API error notice behind an empty select; failing
        // loudly puts the real message in front of the user.
        .then((json: unknown) => optionsFromPayload(json, url, options?.path))
        .catch((error: unknown) => {
          this.cache.delete(key);
          throw error;
        });

      this.cache.set(key, pending);
    }

    return pending;
  }
}
