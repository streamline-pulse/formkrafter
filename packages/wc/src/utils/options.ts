export interface SelectOption {
  label: string;
  value: string;
}

const readPath = (record: Record<string, unknown>, path: string): unknown => {
  if (!path.includes('.')) return record[path];

  let current: unknown = record;
  for (const segment of path.split('.')) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
};

export function normalizeOptions(
  raw: unknown,
  labelKey = 'label',
  valueKey = 'value'
): SelectOption[] {
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (typeof item === 'object' && item !== null) {
          const record = item as Record<string, unknown>;
          const label = readPath(record, labelKey) ?? readPath(record, valueKey);
          const value = readPath(record, valueKey) ?? readPath(record, labelKey);
          return { label: String(label ?? ''), value: String(value ?? '') };
        }

        return { label: String(item), value: String(item) };
      })
      .filter((option) => option.label !== '');
  }

  return String(raw ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({ label: line, value: line }));
}
