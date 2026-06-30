import type { OptionDef } from '@/cli/types.ts';

export const identifier: OptionDef = {
  name: 'identifier',
  type: 'string',
  description: 'Set custom string identifier',
};

export const maxLength: OptionDef = {
  name: 'max-length',
  type: 'number',
  description: 'Set maximum translations length',
};

export const context: OptionDef = {
  name: 'context',
  type: 'string',
  description: 'Set context for translators',
};

export const file: OptionDef = {
  name: 'file',
  type: 'string',
  variadic: true,
  description: 'Set file paths in project',
};

export const label: OptionDef = {
  name: 'label',
  type: 'string',
  variadic: true,
  description: 'Specify label names',
};

export const hidden: OptionDef = {
  name: 'hidden',
  type: 'boolean',
  description: 'Mark string as hidden',
};

export const noHidden: OptionDef = {
  name: 'no-hidden',
  type: 'boolean',
  description: 'Unmark hidden flag',
};

export const filter: OptionDef = {
  name: 'filter',
  type: 'string',
  description: 'Filter strings by text',
};

export const croql: OptionDef = {
  name: 'croql',
  type: 'string',
  description: 'Set CROQL query filter',
};

export const directory: OptionDef = {
  name: 'directory',
  type: 'string',
  description: 'Set directory path',
};

export const scope: OptionDef = {
  name: 'scope',
  type: 'string',
  description: 'Set search scope',
};

export const one: OptionDef = {
  name: 'one',
  type: 'string',
  description: 'Plural form for one',
};

export const two: OptionDef = {
  name: 'two',
  type: 'string',
  description: 'Plural form for two',
};

export const few: OptionDef = {
  name: 'few',
  type: 'string',
  description: 'Plural form for few',
};

export const many: OptionDef = {
  name: 'many',
  type: 'string',
  description: 'Plural form for many',
};

export const zero: OptionDef = {
  name: 'zero',
  type: 'string',
  description: 'Plural form for zero',
};

export const text: OptionDef = {
  name: 'text',
  type: 'string',
  description: 'Set new string text',
};
