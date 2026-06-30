import type { OptionDef } from '@/cli/types.ts';

export const language: OptionDef = {
  name: 'language',
  short: 'l',
  type: 'string',
  default: 'all',
  description: 'View progress for a single specified language. Default: all',
};

export const file: OptionDef = {
  name: 'file',
  short: 'f',
  type: 'string',
  description: 'Path to the source file in Crowdin',
};

export const directory: OptionDef = {
  name: 'directory',
  short: 'd',
  type: 'string',
  description: 'Path to the directory in Crowdin',
};

export const failIfIncompleteStatus: OptionDef = {
  name: 'fail-if-incomplete',
  type: 'boolean',
  description: 'Fail execution if the current project is not fully translated and approved',
};

export const failIfIncompleteTranslation: OptionDef = {
  name: 'fail-if-incomplete',
  type: 'boolean',
  description: 'Fail execution if the current project is not fully translated',
};

export const failIfIncompleteProofreading: OptionDef = {
  name: 'fail-if-incomplete',
  type: 'boolean',
  description: 'Fail execution if the current project is not fully approved',
};
