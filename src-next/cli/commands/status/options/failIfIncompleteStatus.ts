import type { OptionDef } from '@/cli/types.ts';

export default {
  name: 'fail-if-incomplete',
  type: 'boolean',
  description: 'Fail execution if the current project is not fully translated and approved',
} as OptionDef;
