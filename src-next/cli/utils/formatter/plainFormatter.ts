export function formatPlain(data: unknown, cols?: string[]): string {
  if (Array.isArray(data)) {
    return data.map((item) => plainRow(item, cols)).join('\n');
  }

  return plainRow(data, cols);
}

function plainRow(value: unknown, cols?: string[]): string {
  if (cols && value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const row = value as Record<string, unknown>;
    return cols.map((key) => String(row[key] ?? '')).join(' ');
  }

  return plainValue(value);
}

function plainValue(value: unknown): string {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return plainValue(Object.values(value)[0] ?? '');
  }

  return String(value ?? '');
}
