import type { TranslationMemoryModel } from '@crowdin/crowdin-api-client';
import type { OptionDef } from '@/cli/types.ts';

export const TM_FORMATS: TranslationMemoryModel.Format[] = ['tmx', 'csv', 'xlsx'];

export const format: OptionDef = {
  name: 'format',
  type: 'string',
  description: 'Format of the file. Supported formats: tmx, csv, xlsx',
  choices: [...TM_FORMATS],
};

export const sourceLanguageId: OptionDef = {
  name: 'source-language-id',
  type: 'string',
  description: 'Defines source language in the language pair',
};

export const targetLanguageId: OptionDef = {
  name: 'target-language-id',
  type: 'string',
  description: 'Defines target language in the language pair',
};

export const to: OptionDef = {
  name: 'to',
  type: 'string',
  description: 'Path where the translation memory should be downloaded',
};

export const id: OptionDef = {
  name: 'id',
  type: 'string',
  description: 'Translation memory identifier for uploading to the existing TM',
};

export const language: OptionDef = {
  name: 'language',
  type: 'string',
  description: 'Translation Memory language identifier',
};

export const scheme: OptionDef = {
  name: 'scheme',
  type: 'string',
  variadic: true,
  description: 'Defines data columns scheme (required for CSV or XLS/XLSX files)',
};

export const firstLineContainsHeader: OptionDef = {
  name: 'first-line-contains-header',
  type: 'boolean',
  description:
    "Defines whether the file contains the first-row header that shouldn't be imported (used only for CSV or XLS/XLSX files)",
};
