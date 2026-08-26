import type { OptionDef } from '@/cli/types.ts';

// `list` describes --type/--issue-type as filters (Java crowdin.comment.list.*), while `add`
// describes them as setters. Grouped per subcommand so each flag's wording sits together.
// --string-id is shared verbatim, so it stays a single const referenced by both.
const stringId: OptionDef = {
  name: 'string-id',
  type: 'string',
  description: 'Numeric string identifier',
};

export const add = {
  stringId,
  language: {
    name: 'language',
    short: 'l',
    type: 'string',
    description: 'Target language to which the comment belongs',
  },
  type: {
    name: 'type',
    type: 'string',
    description: 'Defines the comment type. Supported types: comment, issue',
    choices: ['comment', 'issue'],
  },
  issueType: {
    name: 'issue-type',
    type: 'string',
    description:
      'Defines the issue type. Supported types: general_question, translation_mistake, context_request, source_mistake',
    choices: ['general_question', 'translation_mistake', 'context_request', 'source_mistake'],
  },
} satisfies Record<string, OptionDef>;

export const list = {
  stringId,
  type: {
    name: 'type',
    type: 'string',
    description: 'Filter by string comment type. Supported types: comment, issue',
    choices: ['comment', 'issue'],
  },
  issueType: {
    name: 'issue-type',
    type: 'string',
    description:
      'Filter by issue type. Supported types: general_question, translation_mistake, context_request, source_mistake',
    choices: ['general_question', 'translation_mistake', 'context_request', 'source_mistake'],
  },
  status: {
    name: 'status',
    type: 'string',
    description: 'Filter by issue resolution status. Supported statuses: resolved, unresolved',
    choices: ['resolved', 'unresolved'],
  },
} satisfies Record<string, OptionDef>;
