import type { OptionDef } from '@/cli/types.ts';

export default {
  name: 'skip-untranslated-files',
  type: 'boolean',
  default: false,
  description: 'Skip untranslated files when exporting translations',
} as OptionDef;
