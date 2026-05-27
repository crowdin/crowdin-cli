import type { OptionDef } from '@/cli/types.ts';

export default {
  name: 'ignore-match',
  type: 'boolean',
  default: false,
  description: 'Ignore match between local and server files',
} as OptionDef;
