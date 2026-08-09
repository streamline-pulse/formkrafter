export function interpolateTemplate(
  template: string,
  dataMap?: Record<string, unknown>
): string {
  return template.replace(/\{(\w+)\}/g, (_, token: string) => {
    const value = dataMap?.[token];
    return value === undefined || value === null ? '' : String(value);
  });
}

export function parseHeaderLines(
  raw: unknown,
  dataMap?: Record<string, unknown>
): Record<string, string> | undefined {
  if (typeof raw !== 'string' || !raw.trim()) return undefined;

  const headers: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const separator = line.indexOf(':');
    if (separator <= 0) continue;

    const name = line.slice(0, separator).trim();
    const value = interpolateTemplate(line.slice(separator + 1).trim(), dataMap);
    if (name) headers[name] = value;
  }

  return Object.keys(headers).length ? headers : undefined;
}

export function appendSearchParam(
  url: string,
  param: string,
  term: string
): string {
  if (!term) return url;

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${encodeURIComponent(param)}=${encodeURIComponent(term)}`;
}
