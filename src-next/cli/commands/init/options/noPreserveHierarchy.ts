import type { OptionDef } from '@/cli/types.ts';

export default {
  name: 'no-preserve-hierarchy',
  type: 'boolean',
  default: true,
  description: 'Choose whether to save the directory hierarchy in the Crowdin project',
} as OptionDef;
