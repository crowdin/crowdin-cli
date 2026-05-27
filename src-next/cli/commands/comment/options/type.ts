import type { OptionDef } from '@/cli/types.ts';

export default {
  name: 'type',
  type: 'string',
  description: 'Defines the comment type. Supported types: comment, issue',
  choices: ['comment', 'issue'],
} as OptionDef;
