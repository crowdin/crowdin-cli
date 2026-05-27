import type { OptionDef } from '@/cli/types.ts';

export default {
  name: 'bundle-id',
  type: 'number',
  variadic: true,
  description: 'Bundle identifier. Can be specified multiple times',
} as OptionDef;
