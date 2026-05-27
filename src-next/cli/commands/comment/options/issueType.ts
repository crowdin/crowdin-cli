import type { OptionDef } from '@/cli/types.ts';

export default {
  name: 'issue-type',
  type: 'string',
  description:
    'Defines the issue type. Supported types: general_question, translation_mistake, context_request, source_mistake',
  choices: ['general_question', 'translation_mistake', 'context_request', 'source_mistake'],
} as OptionDef;
