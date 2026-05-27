import type { OptionDef } from '@/cli/types.ts';

export default {
  name: 'language',
  short: 'l',
  type: 'string',
  description: 'Upload translations for a single specified language',
} as OptionDef;
