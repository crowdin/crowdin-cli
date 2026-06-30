import type { OptionDef } from '@/cli/types.ts';

export const all: OptionDef = {
  name: 'all',
  type: 'boolean',
  default: false,
  description: 'Download all files from the server',
};

export const excludeLanguage: OptionDef = {
  name: 'exclude-language',
  short: 'e',
  type: 'string',
  variadic: true,
  description: 'Exclude translations for the specified language. Can be specified multiple times',
};

export const exportOnlyApproved: OptionDef = {
  name: 'export-only-approved',
  type: 'boolean',
  default: false,
  description: 'Export only approved translations',
};

export const ignoreMatch: OptionDef = {
  name: 'ignore-match',
  type: 'boolean',
  default: false,
  description: 'Ignore match between local and server files',
};

export const keepArchive: OptionDef = {
  name: 'keep-archive',
  type: 'boolean',
  default: false,
  description: 'Keep the downloaded archive after extraction',
};

export const language: OptionDef = {
  name: 'language',
  short: 'l',
  type: 'string',
  variadic: true,
  description: 'Download translations for the specified language. Can be specified multiple times',
};

export const pseudo: OptionDef = {
  name: 'pseudo',
  type: 'boolean',
  default: false,
  description: 'Build pseudo translations',
};

export const reviewed: OptionDef = {
  name: 'reviewed',
  type: 'boolean',
  default: false,
  description: 'Download only reviewed source files',
};

export const skipUntranslatedFiles: OptionDef = {
  name: 'skip-untranslated-files',
  type: 'boolean',
  default: false,
  description: 'Skip untranslated files when exporting translations',
};

export const skipUntranslatedStrings: OptionDef = {
  name: 'skip-untranslated-strings',
  type: 'boolean',
  default: false,
  description: 'Skip untranslated strings when exporting translations',
};
