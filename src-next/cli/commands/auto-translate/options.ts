import type { OptionDef } from '@/cli/types.ts';

export const language: OptionDef = {
  name: 'language',
  short: 'l',
  type: 'string',
  variadic: true,
  default: ['all'],
  description: 'Languages to which auto-translation should be applied. Can be specified multiple times. Default: all',
};

export const excludeLanguage: OptionDef = {
  name: 'exclude-language',
  short: 'e',
  type: 'string',
  variadic: true,
  description: 'Languages to exclude from auto-translation. Can be specified multiple times',
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
  description: 'Defines auto-translation method. Supported values: mt, tm, ai',
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
    'Defines which translations added by TM auto-translation should be auto-approved. Supported values: all, except-auto-substituted, perfect-match-only. Default: none',
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

export const skipApprovedTranslations: OptionDef = {
  name: 'skip-approved-translations',
  type: 'boolean',
  description: 'Skips strings that already have an approved translation',
};

export const scope: OptionDef = {
  name: 'scope',
  type: 'string',
  choices: ['untranslated', 'translated', 'all'],
  description: 'Defines strings that should be auto-translated. Default: untranslated',
};

export const priority: OptionDef = {
  name: 'priority',
  type: 'string',
  choices: ['low', 'normal', 'high'],
  description: 'Defines the auto-translation priority. Default: normal',
};

export const translationModifiedBefore: OptionDef = {
  name: 'translation-modified-before',
  type: 'string',
  description:
    'Re-translates strings only if their translations were modified before the given date-time (e.g. 2024-01-01T00:00:00Z)',
};

export const replaceTranslationsOption: OptionDef = {
  name: 'replace-translations-option',
  type: 'string',
  choices: ['none', 'auto-translated', 'all'],
  description: 'Defines whether to replace existing translations. Default: none',
};

export const resetApprovalStatus: OptionDef = {
  name: 'reset-approval-status',
  type: 'boolean',
  description: 'Removes approval from existing translations that get replaced',
};

export const translateWithPerfectMatchOnly: OptionDef = {
  name: 'translate-with-perfect-match-only',
  type: 'boolean',
  description: 'Applies auto-translation only for the strings with perfect match',
};

export const noTranslateWithPerfectMatchOnly: OptionDef = {
  name: 'no-translate-with-perfect-match-only',
  type: 'boolean',
  hidden: true,
  description: 'Applies auto-translation regardless of perfect match',
};

export const label: OptionDef = {
  name: 'label',
  type: 'string',
  variadic: true,
  description: 'Filter strings to auto-translate by labels. Can be specified multiple times',
};

export const excludeLabel: OptionDef = {
  name: 'exclude-label',
  type: 'string',
  variadic: true,
  description: 'Exclude strings with the specified labels from auto-translation. Can be specified multiple times',
};

export const sourceLanguage: OptionDef = {
  name: 'source-language',
  type: 'string',
  description: 'Auto-translate from the specified source language',
};

export const aiPrompt: OptionDef = {
  name: 'ai-prompt',
  type: 'number',
  description: "AI Prompt Identifier. Required for 'ai' method",
};
