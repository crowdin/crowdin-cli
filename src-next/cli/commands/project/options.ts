import type { OptionDef } from '@/cli/types.ts';

export const language: OptionDef = {
  name: 'language',
  short: 'l',
  type: 'string',
  variadic: true,
  required: true,
  description: 'Target language identifier. Can be specified multiple times',
};

export const languageAccessPolicy: OptionDef = {
  name: 'public',
  type: 'boolean',
  description: 'Defines whether the project is public. Private by default',
};

export const sourceLanguage: OptionDef = {
  name: 'source-language',
  default: 'en',
  type: 'string',
  description: 'Defines the source language. English by default',
};

export const stringBased: OptionDef = {
  name: 'string-based',
  type: 'boolean',
  description: 'Defines whether the project is string-based',
};
