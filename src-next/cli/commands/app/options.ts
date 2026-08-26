import type { OptionDef } from '@/cli/types.ts';

export const force: OptionDef = {
  name: 'force',
  type: 'boolean',
  description: 'Force to delete application installation',
};
