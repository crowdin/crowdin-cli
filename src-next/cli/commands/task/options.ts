import type { OptionDef } from '@/cli/types.ts';

export const status: OptionDef = {
  name: 'status',
  type: 'string',
  description: 'Filter by status. Supported statuses: todo, in_progress, done, closed',
};

export const assigneeId: OptionDef = {
  name: 'assignee-id',
  type: 'number',
  description: 'Filter by assignee identifier',
};

export const description: OptionDef = {
  name: 'description',
  type: 'string',
  description: 'Task description',
};

export const file: OptionDef = {
  name: 'file',
  type: 'string',
  variadic: true,
  description: 'File path in the Crowdin project. Can be specified multiple times',
};

export const includePreTranslatedStringsOnly: OptionDef = {
  name: 'include-pre-translated-strings-only',
  type: 'boolean',
  description: 'Defines whether to export only pre-translated strings',
};

export const label: OptionDef = {
  name: 'label',
  type: 'number',
  variadic: true,
  description: 'Label identifier. Could be specified multiple times',
};

export const language: OptionDef = {
  name: 'language',
  type: 'string',
  description: 'Task Language Identifier',
};

export const skipAssignedStrings: OptionDef = {
  name: 'skip-assigned-strings',
  type: 'boolean',
  description: 'Skip strings already included in other tasks',
};

export const type: OptionDef = {
  name: 'type',
  type: 'string',
  description: 'Task type. Possible values: translate, proofread',
};

export const workflowStep: OptionDef = {
  name: 'workflow-step',
  type: 'number',
  description: 'Task workflow step (Crowdin Enterprise only)',
};
