import type { OptionDef } from '@/cli/types.ts';

export const stringId: OptionDef = {
  name: 'string-id',
  type: 'number',
  variadic: true,
  description: 'Numeric string identifier (multiple identifiers can be specified)',
};

export const search: OptionDef = {
  name: 'search',
  type: 'string',
  description: 'Filter screenshots by name, tagged strings or file names',
};

export const excludeLabel: OptionDef = {
  name: 'exclude-label',
  type: 'string',
  variadic: true,
  description: 'Skip screenshots with the specified labels (multiple labels can be specified)',
};

export const autoTag: OptionDef = {
  name: 'auto-tag',
  type: 'boolean',
  description: 'Choose whether or not to tag screenshot automatically',
};

export const file: OptionDef = {
  name: 'file',
  short: 'f',
  type: 'string',
  description: "Path to the source file in Crowdin. Requires the '--auto-tag' to be passed",
};

export const branch: OptionDef = {
  name: 'branch',
  short: 'b',
  type: 'string',
  description: "Branch name. Requires the '--auto-tag' to be passed",
};

export const label: OptionDef = {
  name: 'label',
  type: 'string',
  variadic: true,
  description: 'Attach labels to screenshot (multiple labels can be specified)',
};

export const filterLabel: OptionDef = {
  name: 'label',
  type: 'string',
  variadic: true,
  description: 'Filter screenshots by labels (multiple labels can be specified)',
};

export const directory: OptionDef = {
  name: 'directory',
  short: 'd',
  type: 'string',
  description: "Path to the directory in Crowdin. Requires the '--auto-tag' to be passed",
};
