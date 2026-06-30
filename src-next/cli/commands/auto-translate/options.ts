import type { OptionDef } from '@/cli/types.ts';

export const language: OptionDef = {
  name: 'language',
  short: 'l',
  type: 'string',
  variadic: true,
  default: ['all'],
  description: 'Languages to which pre-translation should be applied. Can be specified multiple times. Default: all',
};

export const excludeLanguage: OptionDef = {
  name: 'exclude-language',
  short: 'e',
  type: 'string',
  variadic: true,
  description: 'Languages to exclude from pre-translation. Can be specified multiple times',
};

export const file: OptionDef = {
  name: 'file',
  type: 'string',
  variadic: true,
  description: 'Path to the file in the Crowdin project. Can be specified multiple times',
};

export const method: OptionDef = {
  name: 'method',
  type: 'string',
  required: true,
  description: 'Defines pre-translation method. Supported values: mt, tm, ai',
};

export const engineId: OptionDef = {
  name: 'engine-id',
  type: 'number',
  description: 'Machine Translation engine Identifier',
};

export const directory: OptionDef = {
  name: 'directory',
  type: 'string',
  description: 'Path to the directory in Crowdin',
};

export const autoApproveOption: OptionDef = {
  name: 'auto-approve-option',
  type: 'string',
  description:
    'Defines which translations added by TM pre-translation should be auto-approved. Supported values: all, except-auto-substituted, perfect-match-only. Default: none',
};

// Negatable boolean: `--duplicate-translations` / `--no-duplicate-translations`.
// The positive and hidden negative flags share the `duplicateTranslations` property;
// leaving both unset keeps it `undefined` (tri-state), so it is only sent when specified.
export const duplicateTranslations: OptionDef = {
  name: 'duplicate-translations',
  type: 'boolean',
  description: 'Adds translations even if the same translation already exists',
};

export const noDuplicateTranslations: OptionDef = {
  name: 'no-duplicate-translations',
  type: 'boolean',
  hidden: true,
  description: 'Skips adding a translation if the same one already exists',
};

export const translateUntranslatedOnly: OptionDef = {
  name: 'translate-untranslated-only',
  type: 'boolean',
  description: 'Applies pre-translation for untranslated strings only',
};

export const noTranslateUntranslatedOnly: OptionDef = {
  name: 'no-translate-untranslated-only',
  type: 'boolean',
  hidden: true,
  description: 'Applies pre-translation for all strings',
};

export const translateWithPerfectMatchOnly: OptionDef = {
  name: 'translate-with-perfect-match-only',
  type: 'boolean',
  description: 'Applies pre-translation only for the strings with perfect match',
};

export const noTranslateWithPerfectMatchOnly: OptionDef = {
  name: 'no-translate-with-perfect-match-only',
  type: 'boolean',
  hidden: true,
  description: 'Applies pre-translation regardless of perfect match',
};

export const label: OptionDef = {
  name: 'label',
  type: 'string',
  variadic: true,
  description: 'Filter strings to pre-translate by labels. Can be specified multiple times',
};

export const aiPrompt: OptionDef = {
  name: 'ai-prompt',
  type: 'number',
  description: "AI Prompt Identifier. Required for 'ai' method",
};
