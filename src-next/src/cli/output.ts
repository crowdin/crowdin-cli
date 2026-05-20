import type { Command } from 'commander';
import type { GlobalOptions } from './options.ts';
import { createOutput, type Output } from './utils/output.ts';

export function createGetOutput() {
  let cachedOutput: Output | undefined;

  return (command: Command): Output => {
    if (cachedOutput) {
      return cachedOutput;
    }

    const options = command.optsWithGlobals() as GlobalOptions;

    cachedOutput = createOutput(resolveOutputFormat(options.format), options.verbose);

    return cachedOutput;
  };
}

export function resolveOutputFormat(format?: string): 'json' | 'toon' | 'text' {
  if (format === 'json' || format === 'toon') {
    return format;
  }

  return 'text';
}
