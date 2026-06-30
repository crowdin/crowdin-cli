import type { OptionDef } from '@/cli/types.ts';

export const destination: OptionDef = {
  name: 'dest',
  short: 'd',
  type: 'string',
  description: 'Path where the downloaded file should be saved',
};

export const uploadDest: OptionDef = {
  name: 'dest',
  short: 'd',
  type: 'string',
  description: 'File destination in the Crowdin project',
};

export const label: OptionDef = {
  name: 'label',
  type: 'string',
  variadic: true,
  description: 'Attach labels to strings (multiple labels can be specified)',
};

export const parserVersion: OptionDef = {
  name: 'parser-version',
  type: 'string',
  description: "Parser version. Must be used together with the 'type' option",
};

export const type: OptionDef = {
  name: 'type',
  type: 'string',
  description: 'File type',
};
