import type { OptionDef } from '@/cli/types.ts';

export default {
  name: 'verbose',
  short: 'v',
  type: 'boolean',
  description: 'Provide more information about command execution',
} as OptionDef;
