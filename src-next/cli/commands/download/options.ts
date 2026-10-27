import type { OptionDef } from '@/cli/types.ts';

export const all: OptionDef = {
  name: 'all',
  type: 'boolean',
  default: false,
  description: 'Download files even if local sources are missing',
};

export const excludeLanguage: OptionDef = {
  name: 'exclude-language',
  short: 'e',
  type: 'string',
  variadic: true,
  description: 'Skip the language during download. Can be specified multiple times',
};

export const exportOnlyApproved: OptionDef = {
  name: 'export-only-approved',
  type: 'boolean',
  description:
    'Include approved translations only in exported files. If not combined with --skip-untranslated-strings option, strings without approval are fulfilled with the source language',
};

export const noExportOnlyApproved: OptionDef = {
  name: 'no-export-only-approved',
  type: 'boolean',
  description: 'Include unapproved translations in exported files, overriding the config and project settings',
};

export const ignoreMatch: OptionDef = {
  name: 'ignore-match',
  type: 'boolean',
  default: false,
  description: 'Ignore warning message about a configuration change',
};

export const keepArchive: OptionDef = {
  name: 'keep-archive',
  type: 'boolean',
  default: false,
  description: "Do not remove the downloaded archive with translations after it's extracting",
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
  description: 'Download pseudo-localized translation files',
};

export const reviewed: OptionDef = {
  name: 'reviewed',
  type: 'boolean',
  default: false,
  description: 'Download only reviewed sources (Crowdin Enterprise only)',
};

export const skipUntranslatedFiles: OptionDef = {
  name: 'skip-untranslated-files',
  type: 'boolean',
  description: 'Omit downloading not fully translated files',
};

export const noSkipUntranslatedFiles: OptionDef = {
  name: 'no-skip-untranslated-files',
  type: 'boolean',
  description: 'Download not fully translated files, overriding the config and project settings',
};

export const skipUntranslatedStrings: OptionDef = {
  name: 'skip-untranslated-strings',
  type: 'boolean',
  description:
    'Skip untranslated strings in exported files (does not work with .docx, .html, .md and other document files). For more details see https://support.crowdin.com/project-settings/export/#skip-untranslated-strings',
};

export const noSkipUntranslatedStrings: OptionDef = {
  name: 'no-skip-untranslated-strings',
  type: 'boolean',
  description: 'Keep untranslated strings in exported files, overriding the config and project settings',
};
