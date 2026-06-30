import type { GlossariesModel } from '@crowdin/crowdin-api-client';
import type { OptionDef } from '@/cli/types.ts';

export const GLOSSARY_FORMATS: GlossariesModel.GlossaryFormat[] = ['tbx', 'csv', 'xlsx'];

export const format: OptionDef = {
  name: 'format',
  type: 'string',
  description: 'Format of the file. Supported formats: tbx, csv, xlsx',
  choices: [...GLOSSARY_FORMATS],
};

export const to: OptionDef = {
  name: 'to',
  type: 'string',
  description: 'Path the glossary should be downloaded to',
};

export const id: OptionDef = {
  name: 'id',
  type: 'string',
  description: 'Glossary identifier for uploading to the existing glossary',
};

export const language: OptionDef = {
  name: 'language',
  type: 'string',
  description: 'Glossary language identifier',
};

export const scheme: OptionDef = {
  name: 'scheme',
  type: 'string',
  variadic: true,
  description: 'Defines data columns scheme (used only for CSV or XLS/XLSX files configuration)',
};

export const firstLineContainsHeader: OptionDef = {
  name: 'first-line-contains-header',
  type: 'boolean',
  description:
    "Defines whether the file contains the first-row header that shouldn't be imported (used only for CSV or XLS/XLSX files)",
};
