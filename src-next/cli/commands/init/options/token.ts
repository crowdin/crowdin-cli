import type { OptionDef } from '@/cli/types.ts';

export default {
  name: 'token',
  short: 'T',
  type: 'string',
  description: 'Personal access token required for authentication',
} as OptionDef;
