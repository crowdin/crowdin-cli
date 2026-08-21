import { encode } from '@toon-format/toon';

type OutputFormat = 'text' | 'json' | 'toon' | 'plain';

/** The formats that serialize a value wholesale. `text` and `plain` are line-based instead. */
export type StructuredFormat = Extract<OutputFormat, 'json' | 'toon'>;

/**
 * Every `--output` that is a parseable contract rather than prose. `plain` belongs here as much
 * as json and toon do — it is line-oriented instead of structured, which is a different axis.
 */
const MACHINE_FORMATS = ['json', 'toon', 'plain'];

const formatters: Record<StructuredFormat, (data: unknown) => string> = {
  json: (data) => JSON.stringify(data, null, 2),
  toon: (data) => encode(data),
};

export function formatData(data: unknown, format: StructuredFormat): string {
  return formatters[format](data);
}

/** Carries structure — nesting and types — so a whole value survives the round trip. */
export function isStructuredFormat(format?: string): format is StructuredFormat {
  return format === 'json' || format === 'toon';
}

/** Parseable, so a command owes it a result rather than prose. Includes line-oriented `plain`. */
export function isMachineFormat(format?: string): boolean {
  return MACHINE_FORMATS.includes(format ?? '');
}
