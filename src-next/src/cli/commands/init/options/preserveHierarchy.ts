import type { OptionDef } from '../../../types.ts';

export default {
  name: 'preserve-hierarchy',
  // aliases: ['no-preserve-hierarchy'],
  type: 'boolean',
  default: true,
  description: 'Choose whether to save the directory hierarchy in the Crowdin project',
} as OptionDef;
