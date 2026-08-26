import type { OptionDef } from '@/cli/types.ts';

// Java uses per-subcommand descriptionKeys (crowdin.string.<sub>.<opt>), so the
// wording differs between list/add/edit for the same flag. Grouped by subcommand
// so each flag's per-command wording sits together and drift stays visible.

// add/edit --label share the same wording (Java `params.label`).
const labelDescription = 'Attach labels to strings (multiple labels can be specified)';

export const list = {
  file: {
    name: 'file',
    type: 'string',
    variadic: true,
    description: 'Filter strings by file path in Crowdin',
  },
  filter: {
    name: 'filter',
    type: 'string',
    description: 'Filter strings by identifier, text or context',
  },
  croql: {
    name: 'croql',
    type: 'string',
    description: 'Filter strings by CroQL expression',
  },
  directory: {
    name: 'directory',
    type: 'string',
    description: "Path to the directory in Crowdin to filter strings (can't be used together with file or branch)",
  },
  scope: {
    name: 'scope',
    type: 'string',
    description: 'Specify field to be the target of filtering. It can be one scope or a list of comma-separated scopes',
  },
  label: {
    name: 'label',
    type: 'string',
    variadic: true,
    description: 'Filter strings by labels (multiple labels can be specified)',
  },
} satisfies Record<string, OptionDef>;

export const add = {
  identifier: {
    name: 'identifier',
    type: 'string',
    description: 'Set an identifier for the new source string',
  },
  maxLength: {
    name: 'max-length',
    type: 'number',
    description: 'Set a max. length of the translated text for the new source string',
  },
  context: {
    name: 'context',
    type: 'string',
    description: 'Add a context for the new source string',
  },
  file: {
    name: 'file',
    type: 'string',
    variadic: true,
    description: 'Specify a file path to add the new source string to. Multiple files can be specified',
  },
  label: {
    name: 'label',
    type: 'string',
    variadic: true,
    description: labelDescription,
  },
  hidden: {
    name: 'hidden',
    type: 'boolean',
    description: 'Specifies whether the added strings should be hidden or not',
  },
  one: {
    name: 'one',
    type: 'string',
    description: 'Plural form one (singular)',
  },
  two: {
    name: 'two',
    type: 'string',
    description: 'Plural form two (dual)',
  },
  few: {
    name: 'few',
    type: 'string',
    description: 'Plural form few (paucal)',
  },
  many: {
    name: 'many',
    type: 'string',
    description: 'Plural form many',
  },
  zero: {
    name: 'zero',
    type: 'string',
    description: 'Plural form zero',
  },
} satisfies Record<string, OptionDef>;

export const edit = {
  identifier: {
    name: 'identifier',
    type: 'string',
    description: 'Specify new identifier for the source string',
  },
  text: {
    name: 'text',
    type: 'string',
    description: 'Specify new text for the source string',
  },
  context: {
    name: 'context',
    type: 'string',
    description: 'Set new context for source string',
  },
  maxLength: {
    name: 'max-length',
    type: 'number',
    description: 'Set a new max. length of the translated text for the source string',
  },
  label: {
    name: 'label',
    type: 'string',
    variadic: true,
    description: labelDescription,
  },
  hidden: {
    name: 'hidden',
    type: 'boolean',
    description: 'Change the visibility of the source string',
  },
  noHidden: {
    name: 'no-hidden',
    type: 'boolean',
    description: 'Unmark hidden flag',
  },
} satisfies Record<string, OptionDef>;
