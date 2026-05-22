import type { OptionDef } from '../../../types.ts';

export default {
  name: 'language',
  short: 'l',
  type: 'string',
  variadic: true,
  required: true,
  description: 'Target language identifier. Can be specified multiple times',
} as OptionDef;
