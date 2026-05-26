import type { OptionDef } from '@/cli/types.ts';

export default {
  name: 'public',
  type: 'boolean',
  description: 'Defines whether the project is public. Private by default',
} as OptionDef;
