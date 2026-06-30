import type { OptionDef } from '@/cli/types.ts';

export const format: OptionDef = {
  name: 'format',
  type: 'string',
  description: 'Set bundle format',
};

export const source: OptionDef = {
  name: 'source',
  type: 'string',
  variadic: true,
  description: 'Set source patterns',
};

export const ignore: OptionDef = {
  name: 'ignore',
  type: 'string',
  variadic: true,
  description: 'Set ignore patterns',
};

export const translation: OptionDef = {
  name: 'translation',
  type: 'string',
  description: 'Set translation export pattern',
};

export const label: OptionDef = {
  name: 'label',
  type: 'number',
  variadic: true,
  description: 'Specify label identifiers',
};

export const name: OptionDef = {
  name: 'name',
  type: 'string',
  description: 'Set bundle name',
};

export const includeSourceLanguage: OptionDef = {
  name: 'include-source-language',
  type: 'boolean',
  description: 'Include source language into bundle',
};

export const includePseudoLanguage: OptionDef = {
  name: 'include-pseudo-language',
  type: 'boolean',
  description: 'Include pseudo-language into bundle',
};

export const multilingual: OptionDef = {
  name: 'multilingual',
  type: 'boolean',
  description: 'Enable multilingual mode',
};
