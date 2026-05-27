import type { OptionDef } from '@/cli/types.ts';

export default {
  name: 'keep-archive',
  type: 'boolean',
  default: false,
  description: 'Keep the downloaded archive after extraction',
} as OptionDef;
