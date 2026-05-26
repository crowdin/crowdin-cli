import type { OptionDef } from '@/cli/types.ts';

export default {
  name: 'base-url',
  type: 'string',
  description: 'Base URL of Crowdin server for API requests execution',
  default: 'https://api.crowdin.com',
} as OptionDef;
