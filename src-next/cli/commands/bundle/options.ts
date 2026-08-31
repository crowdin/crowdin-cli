import type { OptionDef } from '@/cli/types.ts';

export const format: OptionDef = {
  name: 'format',
  type: 'string',
  description: 'Defines export file format',
};

export const sourcePattern: OptionDef = {
  name: 'source-pattern',
  type: 'string',
  variadic: true,
  description: 'Source pattern. Could be specified multiple times',
};

export const ignorePattern: OptionDef = {
  name: 'ignore-pattern',
  type: 'string',
  variadic: true,
  description: 'Ignore pattern. Could be specified multiple times',
};

export const exportPattern: OptionDef = {
  name: 'export-pattern',
  type: 'string',
  description: 'Bundle export pattern. Defines bundle name in resulting translations bundle',
};

export const label: OptionDef = {
  name: 'label',
  type: 'string',
  variadic: true,
  description: 'Label title. Could be specified multiple times',
};

export const name: OptionDef = {
  name: 'name',
  type: 'string',
  description: 'Bundle name',
};

export const includeSourceLanguage: OptionDef = {
  name: 'include-source-language',
  type: 'boolean',
  description: 'Add project source language to bundle',
};

export const noIncludeSourceLanguage: OptionDef = {
  name: 'no-include-source-language',
  type: 'boolean',
  description: 'Exclude project source language from bundle',
};

export const includePseudoLanguage: OptionDef = {
  name: 'include-pseudo-language',
  type: 'boolean',
  description: 'Add In-Context pseudo-language to bundle',
};

export const noIncludePseudoLanguage: OptionDef = {
  name: 'no-include-pseudo-language',
  type: 'boolean',
  description: 'Exclude In-Context pseudo-language from bundle',
};

export const multilingual: OptionDef = {
  name: 'multilingual',
  type: 'boolean',
  description: 'Export translations in multilingual file',
};

export const noMultilingual: OptionDef = {
  name: 'no-multilingual',
  type: 'boolean',
  description: 'Export translations in separate files per language',
};
