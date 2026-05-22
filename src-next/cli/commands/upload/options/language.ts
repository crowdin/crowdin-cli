import type { OptionDef } from '../../../types.ts';

export default {
  name: 'language',
  short: 'l',
  type: 'string',
  default: 'all',
  description: 'Upload translations for a single specified language. Default: all',
} as OptionDef;
