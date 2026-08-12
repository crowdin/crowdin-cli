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
import { formatData, isMachineFormat as isMachine } from './formatter.ts';

export const OUTPUT_FORMATS = ['json', 'toon', 'plain'];

export type OutputOptions = {
  withGuide?: boolean;
};

/**
 * How one entity renders as a line of human output, keyed by the `--output` format it serves.
 * json/toon never see it — they serialize the item itself.
 */
export type View<T> = {
  /** The default line, mirroring the Java message templates (`message.branch.list` and friends). */
  text: (item: T) => string;
  /** Java's plain line, when it differs from `text` (e.g. branch prints the name alone). */
  plain?: (item: T) => string;
};

export function createOutput(options: GlobalOptions, { withGuide = false }: OutputOptions = {}) {
  const format = resolveOutputFormat(options.output);

  updateSettings({
    // Guide lines off by default; interactive commands (init) opt back in
    withGuide,
  });

  const isMachineFormat = isMachine(format);

  function renderLine<T>(item: T, view: View<T>): string {
    return format === 'plain' && view.plain ? view.plain(item) : view.text(item);
  }

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
    /**
     * A genuinely 2-D grid, which in this CLI is only `status` (languages × translated/proofread).
     * Everything else renders one line per entity through list()/item().
     */
    table(data: unknown): void {
      if (format === 'text') {
        console.table(data);
        return;
      }

      // json/toon serialize the grid; plain is the caller's own business — status prints its
      // per-language report there and never reaches this.
      this.data(data);
    },
    /**
     * A list of entities: one rendered line each in text and plain, the items themselves in
     * json/toon. `items` is the machine contract, so it carries raw values — the view owns
     * every bit of display shaping.
     */
    list<T>(items: T[], view: View<T>, { empty }: { empty?: string } = {}): void {
      if (isMachineFormat) {
        console.log(formatData(items, format));
        return;
      }

      if (format === 'plain') {
        for (const item of items) {
          console.log(renderLine(item, view));
        }

        return;
      }

      if (items.length === 0) {
        // Text prints the message; plain prints nothing, matching Java's plainView branches.
        // No message at all where Java has none for the command (file list).
        if (empty) {
          this.success(empty);
        }

        return;
      }

      for (const item of items) {
        this.success(renderLine(item, view));
      }
    },
    // A single entity, echoed after a mutation. Text marks it done; json/toon serialize it bare.
    item<T>(value: T, view: View<T>): void {
      if (isMachineFormat) {
        console.log(formatData(value, format));
        return;
      }

      if (format === 'plain') {
        console.log(renderLine(value, view));
        return;
      }

      this.success(renderLine(value, view));
    },
    // Serialization channel for json/toon. Silent in text *and* plain, both of which are
    // line-based: a caller that has plain output to emit renders it with list()/item()/report().
    data(value: unknown): void {
      if (!isMachineFormat) {
        return;
      }

      console.log(formatData(value, format));
    },
    // Human-readable, line-based report (e.g. status screens). Prints in text and plain
    // (plain routes through the formatter so it isn't gated); suppressed in json/toon.
    report(lines: string[]): void {
      if (format === 'plain') {
        console.log(lines.join('\n'));
        return;
      }

      for (const line of lines) {
        this.log(line);
      }
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
    // Scanned from argv (not parsed opts) because the top-level error handler runs outside any
    // command action, where parsing may have thrown. Mirrors Java's originalArgs().contains("--debug").
    debug: argv.includes('--debug'),
  };
}

export type Output = ReturnType<typeof createOutput>;
