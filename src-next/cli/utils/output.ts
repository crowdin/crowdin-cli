import {
  cancel,
  intro,
  log,
  outro,
  S_ERROR,
  S_INFO,
  S_SUCCESS,
  S_WARN,
  type SpinnerResult,
  spinner
} from '@clack/prompts';
import type { GlobalOptions } from '../options.ts';
import { colors } from './colors.ts';
import { formatData } from './formatter.ts';

export function createOutput(options: GlobalOptions) {
  const format = resolveOutputFormat(options.format);

  return {
    spinners: {} as Record<string, SpinnerResult>,
    intro(message: string): void {
      if (format === 'text') {
        intro(message);
      }
    },
    outro(message: string): void {
      if (format === 'text') {
        outro(message);
      }
    },
    cancel(message: string): void {
      if (format === 'text') {
        cancel(message);
      }
    },
    table(data: unknown, tableProperties?: string[]): void {
      if (format === 'text') {
        console.table(data, tableProperties);
        return;
      }

      console.log(formatData(data, format));
    },
    debug(data: string): void {
      if (options.verbose) {
        this.info(data);
      }
    },
    log(data: string): void {
      if (format === 'text') {
        log.message(data);
      }
    },
    success(message: string): void {
      if (format === 'text') {
        log.message(message, { symbol: colors.green(S_SUCCESS) });
      }
    },
    info(message: string): void {
      if (format === 'text') {
        log.message(message, { symbol: colors.blue(S_INFO) });
      }
    },
    error(message: string): void {
      if (format === 'text') {
        log.message(message, { symbol: colors.red(S_ERROR) });
      }
    },
    warning(message: string): void {
      if (format === 'text') {
        log.message(message, { symbol: colors.yellow(S_WARN) });
      }
    },
    spinner(
      identifier: string,
      operation: 'start' | 'stop' | 'cancel' | 'error' | 'message' | 'clear',
      message: string,
    ): void {
      if (format !== 'text' || !options.progress) {
        if (operation === 'error') {
          this.error(message);
        } else {
          this.info(message);
        }

        return;
      }

      if (!this.spinners[identifier]) {
        this.spinners[identifier] = spinner();
      }

      this.spinners[identifier][operation](message);
    },
  };
}

function resolveOutputFormat(format?: string): 'json' | 'toon' | 'text' {
  if (format === 'json' || format === 'toon') {
    return format;
  }

  return 'text';
}

export type Output = ReturnType<typeof createOutput>;
