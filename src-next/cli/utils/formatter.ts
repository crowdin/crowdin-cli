import { encode } from '@toon-format/toon';

export type OutputFormat = 'text' | 'json' | 'toon' | 'plain';

/** The formats that serialize a value wholesale. `text` and `plain` are line-based instead. */
export type MachineFormat = Extract<OutputFormat, 'json' | 'toon'>;

const formatters: Record<MachineFormat, (data: unknown) => string> = {
  json: (data) => JSON.stringify(data, null, 2),
  toon: (data) => encode(data),
};

export function formatData(data: unknown, format: MachineFormat): string {
  return formatters[format](data);
}

export function isMachineFormat(format?: string): format is MachineFormat {
  return format === 'json' || format === 'toon';
}
