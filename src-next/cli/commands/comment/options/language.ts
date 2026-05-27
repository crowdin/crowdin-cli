import type { OptionDef } from '@/cli/types.ts';

export default {
  name: 'language',
  short: 'l',
  type: 'string',
  description: 'Target language to which the comment belongs',
} as OptionDef;
