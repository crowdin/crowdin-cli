import { encode } from '@toon-format/toon';
import { formatPlain } from './formatter/plainFormatter.ts';

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
  plain: formatPlain,
};

export function formatData(data: unknown, format: OutputFormat = 'text'): string {
  return formatters[format](data);
}
