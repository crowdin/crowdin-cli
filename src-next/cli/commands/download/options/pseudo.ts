import type { OptionDef } from '@/cli/types.ts';

export default {
  name: 'pseudo',
  type: 'boolean',
  default: false,
  description: 'Build pseudo translations',
} as OptionDef;
