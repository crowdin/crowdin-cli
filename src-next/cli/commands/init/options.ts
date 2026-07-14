import type { OptionDef } from '@/cli/types.ts';

// init's own `--destination` saves the config skeleton (default crowdin.yml).
// Distinct from common's `destination` (--dest, the in-project file name override).
export const destination: OptionDef = {
  name: 'destination',
  short: 'd',
  type: 'string',
  default: 'crowdin.yml',
  description: 'Place where the configuration skeleton should be saved',
};

export const quiet: OptionDef = {
  name: 'quiet',
  type: 'boolean',
  default: false,
  description: 'Generate the configuration skeleton without interactive prompts',
};
