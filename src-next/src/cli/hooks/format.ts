import type { Command } from 'commander';
import type { OutputFormat } from '../utils/formatter.ts';

export default (command: Command) => {
  const options = command.opts();
  const format = options.format;

  if (!(command as any).localContext) {
    (command as any).localContext = {};
  }

  (command as any).localContext.outputFormat = format as OutputFormat;
};
