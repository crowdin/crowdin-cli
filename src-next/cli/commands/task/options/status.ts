import type { OptionDef } from '@/cli/types.ts';

export default {
  name: 'status',
  type: 'string',
  description: 'Filter by status. Supported statuses: todo, in_progress, done, closed',
} as OptionDef;
