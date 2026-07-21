export type LocalizedText = string | Record<string, string>;

export function isLocalizedObject(
  value: unknown
): value is Record<string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0 &&
    Object.values(value).every((entry) => typeof entry === "string")
  );
}

export function resolveLocalizedText(value: unknown, locale?: string): unknown {
  if (!isLocalizedObject(value)) return value;

  if (locale && value[locale] !== undefined) return value[locale];

  return Object.values(value)[0];
}

export function resolveLocalizedRecord<T extends Record<string, unknown>>(
  record: T | undefined,
  locale?: string
): T | undefined {
  if (!record) return record;

  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    resolved[key] = resolveLocalizedText(value, locale);
  }

  return resolved as T;
}
