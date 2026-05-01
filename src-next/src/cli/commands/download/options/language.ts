import type { OptionDef } from '../../../types.ts';

export default {
  name: 'language',
  short: 'l',
  type: 'string',
  variadic: true,
  description: 'Download translations for the specified language. Can be specified multiple times',
} as OptionDef;
