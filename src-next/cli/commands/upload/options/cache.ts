import type { OptionDef } from '@/cli/types.ts';

export default {
  name: 'cache',
  type: 'boolean',
  description: 'Cache source file checksums and skip uploading files that have not changed since the last run',
} as OptionDef;
