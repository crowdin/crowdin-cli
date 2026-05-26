import type { OptionDef } from '@/cli/types.ts';

export default {
  name: 'label',
  type: 'string',
  variadic: true,
  description: 'Attach labels to strings (multiple labels can be specified)',
} as OptionDef;
