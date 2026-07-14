import { config, debug, identity, noColors, noProgress, output, verbose } from './commands/global/options.ts';
import type { OptionDef } from './types.ts';

export default function getGlobalOptions(): OptionDef[] {
  return [verbose, config, identity, noColors, noProgress, output, debug];
}

export type GlobalOptions = {
  verbose: boolean;
  config: string;
  identity?: string;
  colors: boolean;
  progress: boolean;
  output: string;
  debug?: boolean;
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
