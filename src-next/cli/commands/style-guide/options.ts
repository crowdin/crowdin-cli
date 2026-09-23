import type { OptionDef } from '@/cli/types.ts';

export const to: OptionDef = {
  name: 'to',
  type: 'string',
  description: 'Path the style guide should be downloaded to',
};

export const id: OptionDef = {
  name: 'id',
  type: 'number',
  description: 'Style guide identifier for replacing the file of the existing style guide',
};

export const name: OptionDef = {
  name: 'name',
  type: 'string',
  description: 'Name of the new style guide. Defaults to the file name without extension',
};

export const project: OptionDef = {
  name: 'project',
  type: 'number',
  variadic: true,
  description: 'Project identifier to assign the new style guide to. Can be specified multiple times',
};

export const language: OptionDef = {
  name: 'language',
  type: 'string',
  variadic: true,
  description: 'Language identifier to limit the new style guide to. Can be specified multiple times',
};

export const shared: OptionDef = {
  name: 'shared',
  type: 'boolean',
  description: 'Share the new style guide with all projects',
};
