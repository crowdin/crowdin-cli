import type { OptionDef } from '@/cli/types.ts';

export const stringId: OptionDef = {
  name: 'string-id',
  type: 'string',
  description: 'Numeric string identifier',
};

export const language: OptionDef = {
  name: 'language',
  short: 'l',
  type: 'string',
  description: 'Target language to which the comment belongs',
};

export const type: OptionDef = {
  name: 'type',
  type: 'string',
  description: 'Defines the comment type. Supported types: comment, issue',
  choices: ['comment', 'issue'],
};

export const issueType: OptionDef = {
  name: 'issue-type',
  type: 'string',
  description:
    'Defines the issue type. Supported types: general_question, translation_mistake, context_request, source_mistake',
  choices: ['general_question', 'translation_mistake', 'context_request', 'source_mistake'],
};

export const status: OptionDef = {
  name: 'status',
  type: 'string',
  description: 'Filter by issue resolution status. Supported statuses: resolved, unresolved',
  choices: ['resolved', 'unresolved'],
};
