import { updateSettings } from '@clack/prompts';
import type { GlobalOptions } from './options.ts';
import type { BaseOutput } from './output/BaseOutput.ts';
import { enableColors } from './output/colors.ts';
import { isMachineFormat, type OutputFormat } from './output/format.ts';
import { PlainOutput } from './output/PlainOutput.ts';
import { StructuredOutput } from './output/StructuredOutput.ts';
import { TextOutput } from './output/TextOutput.ts';

export type { BaseOutput as Output, TableGrid, View } from './output/BaseOutput.ts';
export { colors, enableColors } from './output/colors.ts';

export type OutputOptions = {
  withGuide?: boolean;
};

export function createOutput(options: GlobalOptions, { withGuide = false }: OutputOptions = {}): BaseOutput {
  const format = resolveOutputFormat(options.output);

  enableColors(options.colors && format === 'text');

  updateSettings({
    withGuide,
  });

  if (format === 'text') {
    return new TextOutput(format, options);
  }

  return format === 'plain' ? new PlainOutput(format, options) : new StructuredOutput(format, options);
}

/**
 * `--output` carries no default, so an unset flag arrives as undefined — commands that branch on
 * the format ask here rather than comparing to 'text' and missing the default case.
 */
export function resolveOutputFormat(format?: string): OutputFormat {
  if (format === 'json' || format === 'toon' || format === 'plain') {
    return format;
  }

  return 'text';
}

/**
 * Resolve the output format straight from argv, before commander parses. Used by the top-level
 * error handler and the version check, both of which run outside any command action.
 */
export function getOutputFormatFromArgs(argv: string[]): GlobalOptions {
  let outputFormat = 'text';

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];

    if (arg === '--output' || arg === '-o') {
      const value = argv[index + 1];

      if (value && isMachineFormat(value)) {
        outputFormat = value;
        break;
      }
    }

    if (arg?.startsWith('--output=')) {
      const value = arg.slice('--output='.length);

      if (isMachineFormat(value)) {
        outputFormat = value;
        break;
      }
    }
  }

  return {
    // Scanned from argv for the same reason as `debug` below: the error handler needs the top-level
    // message colored the way the running command would have colored it.
    colors: !argv.includes('--no-colors'),
    config: '',
    progress: false,
    verbose: false,
    output: outputFormat,
    // Scanned from argv (not parsed opts) because the top-level error handler runs outside any
    // command action, where parsing may have thrown.
    debug: argv.includes('--debug'),
  };
}
