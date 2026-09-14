import type { OptionDef } from '@/cli/types.ts';

// --file/--directory are shared verbatim across all modes, so they stay flat.
export const file: OptionDef = {
  name: 'file',
  short: 'f',
  type: 'string',
  description: 'Path to the source file in Crowdin',
};

export const directory: OptionDef = {
  name: 'directory',
  short: 'd',
  type: 'string',
  description: 'Path to the directory in Crowdin',
};

// --language and --fail-if-incomplete are worded per mode, so grouped per subcommand. Default and
// translation share the language wording but differ on fail-if-incomplete.
export const status = {
  language: {
    name: 'language',
    short: 'l',
    type: 'string',
    default: 'all',
    description: 'View progress for a single specified language',
  },
  failIfIncomplete: {
    name: 'fail-if-incomplete',
    type: 'boolean',
    description: 'Fail execution if the current project is not fully translated and approved',
  },
} satisfies Record<string, OptionDef>;

export const translation = {
  language: {
    name: 'language',
    short: 'l',
    type: 'string',
    default: 'all',
    description: 'View progress for a single specified language',
  },
  failIfIncomplete: {
    name: 'fail-if-incomplete',
    type: 'boolean',
    description: 'Fail execution if the current project is not fully translated',
  },
} satisfies Record<string, OptionDef>;

export const proofreading = {
  language: {
    name: 'language',
    short: 'l',
    type: 'string',
    default: 'all',
    description: 'Use this option to show progress for a single specified language',
  },
  failIfIncomplete: {
    name: 'fail-if-incomplete',
    type: 'boolean',
    description: 'Fail execution if the current project is not fully approved',
  },
} satisfies Record<string, OptionDef>;
