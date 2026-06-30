import { config, identity, noColors, noProgress, output, verbose } from './commands/global/options.ts';
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
