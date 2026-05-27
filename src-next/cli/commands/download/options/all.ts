import type { OptionDef } from '@/cli/types.ts';

export default {
  name: 'all',
  type: 'boolean',
  default: false,
  description: 'Download all files from the server',
} as OptionDef;
