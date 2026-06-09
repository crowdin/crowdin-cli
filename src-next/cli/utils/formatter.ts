import { encode } from '@toon-format/toon';

export type OutputFormat = 'text' | 'json' | 'toon' | 'plain';

const formatters: Record<OutputFormat, (data: unknown) => string> = {
  text: (data) => {
    if (typeof data === 'object') {
      return JSON.stringify(data, null, 2);
    }

    return String(data);
  },
  json: (data) => JSON.stringify(data, null, 2),
  toon: (data) => encode(data),
  plain: (data) => {
    if (Array.isArray(data)) {
      return data
        .map((item) => {
          if (item !== null && typeof item === 'object') {
            return String(Object.values(item)[0] ?? '');
          }

          return String(item);
        })
        .join('\n');
    }

    if (data !== null && typeof data === 'object') {
      return String(Object.values(data)[0] ?? '');
    }

    return String(data);
  },
};

export function formatData(data: unknown, format: OutputFormat = 'text'): string {
  return formatters[format](data);
}
