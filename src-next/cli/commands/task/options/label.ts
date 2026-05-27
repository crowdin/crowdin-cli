import type { OptionDef } from '@/cli/types.ts';

export default {
  name: 'label',
  type: 'number',
  variadic: true,
  description: 'Label identifier. Could be specified multiple times',
} as OptionDef;
