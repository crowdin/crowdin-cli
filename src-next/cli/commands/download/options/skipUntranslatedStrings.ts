import type { OptionDef } from '@/cli/types.ts';

export default {
  name: 'skip-untranslated-strings',
  type: 'boolean',
  default: false,
  description: 'Skip untranslated strings when exporting translations',
} as OptionDef;
