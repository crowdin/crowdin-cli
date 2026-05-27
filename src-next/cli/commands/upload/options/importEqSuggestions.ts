import type { OptionDef } from '@/cli/types.ts';

export default {
  name: 'import-eq-suggestions',
  type: 'boolean',
  description: "Specifies whether to add a translation if it's the same as the source string",
} as OptionDef;
