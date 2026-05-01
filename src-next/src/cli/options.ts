import config from './commands/global/options/config.ts';
import format from './commands/global/options/format.ts';
import noColors from './commands/global/options/noColors.ts';
import noProgress from './commands/global/options/noProgress.ts';
import verbose from './commands/global/options/verbose.ts';
import type { OptionDef } from './types.ts';

export default function getGlobalOptions(): OptionDef[] {
  return [verbose, config, noColors, noProgress, format];
}

export type GlobalOptions = {
  verbose: boolean;
  config: string;
  noColors: boolean;
  noProgress: boolean;
  format: string;
};
