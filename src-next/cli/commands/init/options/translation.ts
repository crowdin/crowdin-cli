import type { OptionDef } from '@/cli/types.ts';

export default {
  name: 'translation',
  short: 't',
  type: 'string',
  description: 'Path to the translation files',
} as OptionDef;
