import type { OptionDef } from '@/cli/types.ts';

export default {
  name: 'branch',
  short: 'b',
  type: 'string',
  default: 'none',
  description: 'Specify branch name. Default: none',
} as OptionDef;
