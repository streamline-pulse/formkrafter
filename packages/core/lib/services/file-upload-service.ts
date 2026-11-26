export interface FileLike {
  name: string;
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface UploadedFile {
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface FileUploadOptions {
  url?: string;
  headers?: Record<string, string>;
}

export interface FileUploadService {
  upload(file: FileLike, options?: FileUploadOptions): Promise<UploadedFile>;
  remove?(file: UploadedFile, options?: FileUploadOptions): Promise<void>;
}

export class Base64FileUploadService implements FileUploadService {
  async upload(file: FileLike): Promise<UploadedFile> {
    const encode = (globalThis as { btoa?: (raw: string) => string }).btoa;
    if (!encode) throw new Error("No base64 encoder available");

    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);

    return {
      name: file.name,
      type: file.type,
      size: file.size,
      url: `data:${file.type};base64,${encode(binary)}`,
    };
  }
}

export interface UrlFileUploadDefaults {
  url?: string;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
  fieldName?: string;
  fetch?: typeof fetch;
}

export class UrlFileUploadService implements FileUploadService {
  constructor(private readonly defaults: UrlFileUploadDefaults = {}) {}

  private get fetchImplementation(): typeof fetch {
    return this.defaults.fetch ?? globalThis.fetch.bind(globalThis);
  }

  private resolveUrl(options?: FileUploadOptions): string {
    const url = options?.url ?? this.defaults.url;
    if (!url) {
      throw new Error(
        "No upload URL configured — set it on the brick (uploadUrl) or on UrlFileUploadService"
      );
    }
    return url;
  }

  private mergedHeaders(options?: FileUploadOptions): Record<string, string> {
    return { ...this.defaults.headers, ...options?.headers };
  }

  async upload(
    file: FileLike,
    options?: FileUploadOptions
  ): Promise<UploadedFile> {
    const url = this.resolveUrl(options);

    const blob =
      typeof Blob !== "undefined" && file instanceof Blob
        ? file
        : new Blob([await file.arrayBuffer()], { type: file.type });

    const body = new FormData();
    body.append(this.defaults.fieldName ?? "file", blob, file.name);

    const response = await this.fetchImplementation(url, {
      method: "POST",
      body,
      headers: this.mergedHeaders(options),
      credentials: this.defaults.credentials,
    });

    if (!response.ok) {
      throw new Error(`Upload failed (${response.status})`);
    }

    const payload = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const uploadedUrl =
      payload.url ?? payload.path ?? payload.location ?? payload.href;

    return {
      name: file.name,
      type: file.type,
      size: file.size,
      url: typeof uploadedUrl === "string" ? uploadedUrl : "",
    };
  }

  async remove(file: UploadedFile, options?: FileUploadOptions): Promise<void> {
    if (!file.url) return;

    const target = /^https?:\/\//.test(file.url)
      ? file.url
      : this.resolveUrl(options);

    const response = await this.fetchImplementation(target, {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
        ...this.mergedHeaders(options),
      },
      credentials: this.defaults.credentials,
      body: JSON.stringify({ url: file.url, name: file.name }),
    });

    if (!response.ok) {
      throw new Error(`Delete failed (${response.status})`);
    }
  }
}
