import type { OptionDef } from '@/cli/types.ts';

export default {
  name: 'no-colors',
  type: 'boolean',
  description: 'Disable colors and styles',
  default: true,
} as OptionDef;
