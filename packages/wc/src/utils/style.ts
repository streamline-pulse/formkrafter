const toCamel = (key: string) =>
  key.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());

export function asInlineStyle(
  styles?: Record<string, unknown>
): Record<string, string> | undefined {
  const entries = Object.entries(styles ?? {}).filter(
    ([, value]) => value !== undefined && value !== null && value !== ''
  );
  if (entries.length === 0) return undefined;

  const result: Record<string, string> = {};
  for (const [key, value] of entries) {
    result[toCamel(key)] = String(value);
  }

  return result;
}
