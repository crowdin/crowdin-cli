import {
  cancel,
  intro,
  outro,
  S_ERROR,
  S_INFO,
  S_SUCCESS,
  S_WARN,
  type SpinnerResult,
  spinner,
  updateSettings,
} from '@clack/prompts';
import type { GlobalOptions } from '../options.ts';
import { colors } from './colors.ts';
import { formatData } from './formatter.ts';

export const OUTPUT_FORMATS = ['json', 'toon', 'plain'];

export function createOutput(options: GlobalOptions) {
  const format = resolveOutputFormat(options.output);

  updateSettings({
    // Disable guide lines globally
    withGuide: false,
  });

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
        console.log(data);
      }
    },
    success(message: string): void {
      if (format === 'text') {
        console.log(`${colors.green(S_SUCCESS)}  ${message}`);
      }
    },
    info(message: string): void {
      if (format === 'text') {
        console.log(`${colors.blue(S_INFO)}  ${message}`);
      }
    },
    error(message: string): void {
      console.log(`${colors.red(S_ERROR)}  ${message}`);
    },
    warning(message: string): void {
      if (format === 'text') {
        console.log(`${colors.yellow(S_WARN)}  ${message}`);
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

      // clack hardcodes the spinner's error symbol (S_STEP_ERROR); clear it and
      // render our own symbol line instead so error styling stays consistent.
      if (operation === 'error') {
        this.spinners[identifier].clear();
        this.error(message);
        return;
      }

      this.spinners[identifier][operation](message);
    },
  };
}

function resolveOutputFormat(format?: string): 'json' | 'toon' | 'text' | 'plain' {
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

      if (value && OUTPUT_FORMATS.includes(value)) {
        outputFormat = value;
        break;
      }
    }

    if (arg?.startsWith('--output=')) {
      const value = arg.slice('--output='.length);

      if (OUTPUT_FORMATS.includes(value)) {
        outputFormat = value;
        break;
      }
    }
  }

  return {
    colors: false,
    config: '',
    progress: false,
    verbose: false,
    output: outputFormat,
  };
}

export type Output = ReturnType<typeof createOutput>;
