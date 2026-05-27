import type { OptionDef } from '@/cli/types.ts';

export default {
  name: 'reviewed',
  type: 'boolean',
  default: false,
  description: 'Download only reviewed source files',
} as OptionDef;
