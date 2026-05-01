import { encode } from '@toon-format/toon';

export type OutputFormat = 'text' | 'json' | 'toon';

const formatters: Record<OutputFormat, (data: any) => string> = {
  text: (data) => {
    if (typeof data === 'object') {
      return JSON.stringify(data, null, 2);
    }

    return String(data);
  },
  json: (data) => JSON.stringify(data, null, 2),
  toon: (data) => encode(data),
};

export function formatData(data: any, format: OutputFormat = 'text'): string {
  return formatters[format](data);
}
