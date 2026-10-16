import type { FileLike } from "./file_upload_service.js";

/**
 * What a document reader returns for a scanned or uploaded document: the
 * text it could read, the fields it was asked for, and some metadata. The
 * reader itself (OCR, layout analysis, a language model…) lives on the host:
 * FormKrafter only sends the file and keeps the answer.
 */
export interface DocumentReading {
  /** Plain text (or Markdown) read from the document. */
  text?: string;
  /** The fields that were requested, by key; `null` when not found. */
  fields?: Record<string, unknown>;
  pages?: number;
  /** Free label of the engine that produced the reading. */
  engine?: string;
  /** Reading confidence in [0, 1] when the engine provides one. */
  confidence?: number;
  warnings?: string[];
}

export interface DocumentReadOptions {
  url?: string;
  headers?: Record<string, string>;
  /** Field keys the reader should extract (see `parseDocumentFields`). */
  fields?: { key: string; label?: string }[];
  /** Language hint for OCR, e.g. `fr`. */
  language?: string;
  /**
   * The form context (`_`-prefixed keys such as `_processVersionId`). The
   * default reader does not send it; a host reader may use it to scope the
   * reading (organisation, process…).
   */
  context?: Record<string, unknown>;
}

export interface DocumentReaderService {
  read(file: FileLike, options?: DocumentReadOptions): Promise<DocumentReading>;
}

export interface FetchDocumentReaderDefaults {
  url?: string;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
  fieldName?: string;
  fetch?: typeof fetch;
}

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;

/** Normalises whatever a reader answered into a `DocumentReading`. */
export function readDocumentReading(payload: unknown): DocumentReading {
  const root = asRecord(payload) ?? {};
  const data = asRecord(root.data) ?? root;
  const text =
    typeof data.text === "string"
      ? data.text
      : typeof data.md_content === "string"
        ? data.md_content
        : typeof data.content === "string"
          ? data.content
          : undefined;
  const reading: DocumentReading = {};
  if (text !== undefined) reading.text = text;
  const fields = asRecord(data.fields);
  if (fields) reading.fields = fields;
  if (typeof data.pages === "number") reading.pages = data.pages;
  if (typeof data.engine === "string") reading.engine = data.engine;
  if (typeof data.confidence === "number") reading.confidence = data.confidence;
  if (Array.isArray(data.warnings)) reading.warnings = data.warnings.filter((w): w is string => typeof w === "string");
  return reading;
}

/**
 * Default reader: POSTs the file as multipart (`file`, plus `fields` as a
 * comma-separated list and `language`) to the URL and reads the JSON answer.
 */
export class FetchDocumentReaderService implements DocumentReaderService {
  constructor(private readonly defaults: FetchDocumentReaderDefaults = {}) {}

  async read(file: FileLike, options: DocumentReadOptions = {}): Promise<DocumentReading> {
    const url = options.url || this.defaults.url;
    if (!url) throw new Error("No document reader URL configured");
    const body = new FormData();
    const blob = file instanceof Blob ? file : new Blob([await file.arrayBuffer()], { type: file.type });
    body.append(this.defaults.fieldName ?? "file", blob, file.name);
    if (options.fields?.length) body.append("fields", options.fields.map((field) => field.key).join(","));
    if (options.fields?.length) body.append("fieldLabels", JSON.stringify(Object.fromEntries(options.fields.map((f) => [f.key, f.label ?? f.key]))));
    if (options.language) body.append("language", options.language);
    const doFetch = this.defaults.fetch ?? globalThis.fetch.bind(globalThis);
    const response = await doFetch(url, {
      method: "POST",
      body,
      credentials: this.defaults.credentials,
      headers: { accept: "application/json", ...this.defaults.headers, ...options.headers },
    });
    if (!response.ok) {
      let message = `Document reading failed (${response.status})`;
      try {
        const payload = (await response.json()) as { message?: string };
        if (payload?.message) message = payload.message;
      } catch {
        // Reponse sans JSON : le statut suffit.
      }
      throw new Error(message);
    }
    return readDocumentReading(await response.json());
  }
}
