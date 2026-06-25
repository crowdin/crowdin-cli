import type { OptionDef } from '@/cli/types.ts';

// Config-options `--dest` for file-based commands. Distinct from init's `destination` (which saves the
// config skeleton, defaulting to crowdin.yml): here it overrides the in-project file destination, so it
// must have no default — otherwise the value would always override the configured `dest`.
export default {
  name: 'destination',
  short: 'd',
  type: 'string',
  description: 'Specify file name in Crowdin',
} as OptionDef;
