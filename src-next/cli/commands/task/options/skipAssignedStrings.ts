import type { OptionDef } from '@/cli/types.ts';

export default {
  name: 'skip-assigned-strings',
  type: 'boolean',
  description: 'Skip strings already included in other tasks',
} as OptionDef;
