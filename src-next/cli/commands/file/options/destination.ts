import type { OptionDef } from '@/cli/types.ts';

export default {
  name: 'dest',
  short: 'd',
  type: 'string',
  description: 'Path where the downloaded file should be saved',
} as OptionDef;
