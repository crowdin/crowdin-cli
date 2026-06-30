import type { OptionDef } from '@/cli/types.ts';

export const verbose: OptionDef = {
  name: 'verbose',
  short: 'v',
  type: 'boolean',
  description: 'Provide more information about command execution',
};

export const config: OptionDef = {
  name: 'config',
  short: 'c',
  type: 'string',
  description: 'Specify a path to the configuration file',
  default: 'crowdin.yml',
};

export const identity: OptionDef = {
  name: 'identity',
  type: 'string',
  description: 'Path to user-specific credentials',
};

export const noColors: OptionDef = {
  name: 'no-colors',
  type: 'boolean',
  description: 'Disable colors and styles',
  default: true,
};

export const noProgress: OptionDef = {
  name: 'no-progress',
  type: 'boolean',
  description: 'Disable progress on executed command',
  default: true,
};

export const output: OptionDef = {
  name: 'output',
  short: 'o',
  type: 'string',
  description: 'Change output format',
  choices: ['json', 'toon', 'plain'],
};
