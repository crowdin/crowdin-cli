import type { OptionDef } from '@/cli/types.ts';

export default {
  name: 'export-only-approved',
  type: 'boolean',
  default: false,
  description: 'Export only approved translations',
} as OptionDef;
