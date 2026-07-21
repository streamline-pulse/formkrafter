export interface SelectOption {
  label: string;
  value: string;
}

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
          const label = record[labelKey] ?? record[valueKey];
          const value = record[valueKey] ?? record[labelKey];
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
