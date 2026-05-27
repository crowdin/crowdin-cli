import type { OptionDef } from '@/cli/types.ts';

export default {
  name: 'file',
  type: 'string',
  variadic: true,
  description: 'File path in the Crowdin project. Can be specified multiple times',
} as OptionDef;
