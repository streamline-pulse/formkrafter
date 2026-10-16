/**
 * Document bricks: the fields a reader should look for and the form keys they
 * fill, both written one per line in the brick configuration.
 */

export interface DocumentField {
  key: string;
  label?: string;
}

/** `key|Label` per line (or `key` alone); blank lines and `#` comments ignored. */
export function parseDocumentFields(source: unknown): DocumentField[] {
  if (Array.isArray(source))
    return source
      .filter((item): item is DocumentField => !!item && typeof item === "object" && typeof (item as DocumentField).key === "string")
      .map((item) => ({ key: item.key.trim(), ...(item.label ? { label: item.label } : {}) }))
      .filter((item) => item.key);
  if (typeof source !== "string") return [];
  const out: DocumentField[] = [];
  const seen = new Set<string>();
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const [keyPart, ...labelParts] = line.split("|");
    const key = (keyPart ?? "").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const label = labelParts.join("|").trim();
    out.push(label ? { key, label } : { key });
  }
  return out;
}

/** `field=formKey` per line: which form key each read field fills. */
export function parseDocumentFills(source: unknown): Record<string, string> {
  if (typeof source !== "string") return {};
  const out: Record<string, string> = {};
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    const field = line.slice(0, index).trim();
    const target = line.slice(index + 1).trim();
    if (field && target) out[field] = target;
  }
  return out;
}

/** The form patch a reading produces: only the mapped fields with a value. */
export function documentFillPatch(fields: Record<string, unknown> | undefined, fills: Record<string, string>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (!fields) return patch;
  for (const [field, target] of Object.entries(fills)) {
    const value = fields[field];
    if (value === undefined || value === null || value === "") continue;
    patch[target] = value;
  }
  return patch;
}
