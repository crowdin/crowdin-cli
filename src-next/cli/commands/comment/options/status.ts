import type { OptionDef } from '@/cli/types.ts';

export default {
  name: 'status',
  type: 'string',
  description: 'Filter by issue resolution status. Supported statuses: resolved, unresolved',
  choices: ['resolved', 'unresolved'],
} as OptionDef;
