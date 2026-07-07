import type { OptionDef } from '@/cli/types.ts';

export const bundleId: OptionDef = {
  name: 'bundle-id',
  type: 'number',
  variadic: true,
  description: 'Bundle ID. Can be specified multiple times',
};

export const name: OptionDef = {
  name: 'name',
  type: 'string',
  description: 'New distribution name',
};
