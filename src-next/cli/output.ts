import type { Command } from 'commander';
import type { GlobalOptions } from './options.ts';
import { createOutput, type Output, type OutputOptions } from './utils/output.ts';

export function createGetOutput() {
  let cachedOutput: Output | undefined;

  return (command: Command, outputOptions?: OutputOptions): Output => {
    if (cachedOutput) {
      return cachedOutput;
    }

    const options = command.optsWithGlobals() as GlobalOptions;

    cachedOutput = createOutput(options, outputOptions);

    return cachedOutput;
  };
}
