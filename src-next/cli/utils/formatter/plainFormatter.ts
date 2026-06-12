export function formatPlain(data: unknown): string {
  if (Array.isArray(data)) {
    return data.map((item) => plainValue(item)).join('\n');
  }

  return plainValue(data);
}

function plainValue(value: unknown): string {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return plainValue(Object.values(value)[0] ?? '');
  }

  return String(value ?? '');
}
