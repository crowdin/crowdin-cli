import config from './commands/global/options/config.ts';
import identity from './commands/global/options/identity.ts';
import noColors from './commands/global/options/noColors.ts';
import noProgress from './commands/global/options/noProgress.ts';
import output from './commands/global/options/output.ts';
import verbose from './commands/global/options/verbose.ts';
import type { OptionDef } from './types.ts';

export default function getGlobalOptions(): OptionDef[] {
  return [verbose, config, identity, noColors, noProgress, output];
}

export type GlobalOptions = {
  verbose: boolean;
  config: string;
  identity?: string;
  colors: boolean;
  progress: boolean;
  output: string;
};

export type ConfigOptions = {
  token?: string;
  basePath?: string;
  baseUrl?: string;
  projectId?: number;
  source?: string;
  translation?: string;
  destination?: string;
  preserveHierarchy?: boolean;
};
