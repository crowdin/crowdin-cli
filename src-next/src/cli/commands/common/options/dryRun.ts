import type { OptionDef } from '../../../types.ts';

export default {
  name: 'dry-run',
  type: 'boolean',
  default: false,
  description: 'Print a command output without execution',
} as OptionDef;
