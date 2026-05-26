import type { OptionDef } from '@/cli/types.ts';

export default {
  name: 'file',
  short: 'f',
  type: 'string',
  description: 'Path to the source file in Crowdin',
} as OptionDef;
