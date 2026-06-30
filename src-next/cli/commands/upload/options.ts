import type { OptionDef } from '@/cli/types.ts';

export const autoApproveImported: OptionDef = {
  name: 'auto-approve-imported',
  type: 'boolean',
  description: 'Approve added translations automatically',
};

export const cache: OptionDef = {
  name: 'cache',
  type: 'boolean',
  description: 'Cache source file checksums and skip uploading files that have not changed since the last run',
};

export const deleteObsolete: OptionDef = {
  name: 'delete-obsolete',
  type: 'boolean',
  description:
    'Delete obsolete files and folders from the Crowdin project that no longer match the source configuration or have been deleted locally',
};

export const excludedLanguage: OptionDef = {
  name: 'excluded-language',
  type: 'string',
  variadic: true,
  description: 'Specify languages the sources should not be translated into. Can be specified multiple times',
};

export const importEqSuggestions: OptionDef = {
  name: 'import-eq-suggestions',
  type: 'boolean',
  description: "Specifies whether to add a translation if it's the same as the source string",
};

export const label: OptionDef = {
  name: 'label',
  type: 'string',
  variadic: true,
  description: 'Attach labels to strings (multiple labels can be specified)',
};

export const language: OptionDef = {
  name: 'language',
  short: 'l',
  type: 'string',
  description: 'Upload translations for a single specified language',
};

export const noAutoUpdate: OptionDef = {
  name: 'no-auto-update',
  type: 'boolean',
  description: 'Specify whether to update existing source files in the Crowdin project or only upload new ones',
};

export const translateHidden: OptionDef = {
  name: 'translate-hidden',
  type: 'boolean',
  description: 'Upload translations to hidden source strings',
};
