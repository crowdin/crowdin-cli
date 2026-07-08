import type { OptionDef } from '@/cli/types.ts';

// upload/download both take --dest but with different wording (Java crowdin.file.<sub>.dest),
// so grouped per subcommand to keep each flag's wording together.

export const upload = {
  label: {
    name: 'label',
    type: 'string',
    variadic: true,
    description: 'Attach labels to strings (multiple labels can be specified)',
  },
  dest: {
    name: 'dest',
    short: 'd',
    type: 'string',
    description: 'File destination in the Crowdin project',
  },
  context: {
    name: 'context',
    type: 'string',
    description: 'File context',
  },
  type: {
    name: 'type',
    type: 'string',
    description: 'File type',
  },
  parserVersion: {
    name: 'parser-version',
    type: 'string',
    description: "Parser version. Must be used together with the 'type' option",
  },
  excludedLanguage: {
    name: 'excluded-language',
    type: 'string',
    variadic: true,
    description: 'Specify languages the sources should not be translated into. Can be specified multiple times',
  },
  noAutoUpdate: {
    name: 'no-auto-update',
    type: 'boolean',
    default: false,
    description: 'Specify whether to update the file in the Crowdin project if it already exists',
  },
  language: {
    name: 'language',
    short: 'l',
    type: 'string',
    description: 'Target language identifier',
  },
  xliff: {
    name: 'xliff',
    type: 'boolean',
    default: false,
    description: 'Is file for offline translation',
  },
  cleanupMode: {
    name: 'cleanup-mode',
    type: 'boolean',
    default: false,
    description:
      'Specify whether to delete all strings with a system label that do not exist in the file (string-based projects only)',
  },
  updateStrings: {
    name: 'update-strings',
    type: 'boolean',
    default: false,
    description: 'Specify whether to update strings that have the same keys (string-based projects only)',
  },
} satisfies Record<string, OptionDef>;

export const download = {
  dest: {
    name: 'dest',
    short: 'd',
    type: 'string',
    description: 'Path where the downloaded file should be saved',
  },
  language: {
    name: 'language',
    short: 'l',
    type: 'string',
    description: 'Target language identifier',
  },
} satisfies Record<string, OptionDef>;
