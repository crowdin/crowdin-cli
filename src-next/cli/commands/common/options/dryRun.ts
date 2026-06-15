import type { OptionDef } from '@/cli/types.ts';

export default {
  // Matches the Java CLI flag spelling (`--dryrun`); Commander exposes it as `options.dryrun`.
  name: 'dryrun',
  type: 'boolean',
  description: 'Print a command output without execution',
} as OptionDef;
