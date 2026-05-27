import type { OptionDef } from '@/cli/types.ts';

export default {
  name: 'exclude-language',
  short: 'e',
  type: 'string',
  variadic: true,
  description: 'Exclude translations for the specified language. Can be specified multiple times',
} as OptionDef;
