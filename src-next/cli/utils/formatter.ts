import { encode } from '@toon-format/toon';
import { formatPlain } from './formatter/plainFormatter.ts';

export type OutputFormat = 'text' | 'json' | 'toon' | 'plain';

const formatters: Record<OutputFormat, (data: unknown, plainCols?: string[]) => string> = {
  text: (data) => {
    if (typeof data === 'object') {
      return JSON.stringify(data, null, 2);
    }

    return String(data);
  },
  json: (data) => JSON.stringify(data, null, 2),
  toon: (data) => encode(data),
  plain: (data, plainCols) => formatPlain(data, plainCols),
};

export function formatData(data: unknown, format: OutputFormat = 'text', plainCols?: string[]): string {
  return formatters[format](data, plainCols);
}
