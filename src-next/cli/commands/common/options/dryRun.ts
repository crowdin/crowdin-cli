import type { OptionDef } from '@/cli/types.ts';

export default {
  name: 'dry-run',
  type: 'boolean',
  description: 'Print a command output without execution',
} as OptionDef;
