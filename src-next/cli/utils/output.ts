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
import { Table } from 'console-table-printer';
import type { GlobalOptions } from '../options.ts';
import { colors, enableColors } from './colors.ts';
import { formatData, isMachineFormat, isStructuredFormat } from './formatter.ts';

// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC is what an SGR sequence starts with
const SGR_SEQUENCE = /\u001b\[[0-9;]*m/g;

/**
 * clack styles the spinner with node's `styleText` rather than through our colors module — the
 * animated frame, the symbol it settles on, and the 'Canceled' line its own SIGINT/exit handlers
 * print. Only the frame takes a hook, and the handlers run outside our wrapper entirely, so
 * `--no-colors` strips color on the way out instead. Cursor and erase sequences have to survive
 * or the spinner scrolls instead of animating in place.
 *
 * Everything but `write` has to reach the real stream: on a TTY clack hands this to
 * `readline.createInterface`, which subscribes with `output.on('resize')` and reads `columns`.
 * A shim that declares only the members clack looks like it uses throws there, so forward the
 * whole stream and intercept the one method.
 */
export const uncoloredStdout = new Proxy(process.stdout, {
  get(target, property) {
    if (property !== 'write') {
      return Reflect.get(target, property, target);
    }

    return (chunk: unknown, ...rest: unknown[]) =>
      (target.write as (...args: unknown[]) => boolean)(
        typeof chunk === 'string' ? chunk.replace(SGR_SEQUENCE, '') : chunk,
        ...rest,
      );
  },
});

export type OutputOptions = {
  withGuide?: boolean;
};

/**
 * How one entity renders per `--output` format: a line in text and plain, a narrowed record in
 * json/toon.
 */
/** A row-list grid: column definitions plus the rows themselves, duplicates and all. */
export type TableGrid = {
  columns: { name: string; title: string; alignment?: 'left' | 'right' }[];
  rows: Record<string, string | number>[];
};

export type View<T> = {
  /** The default line, mirroring the Java message templates (`message.branch.list` and friends). */
  text: (item: T) => string;
  /**
   * Java's plain line, when it differs from `text` (e.g. branch prints the name alone); left off,
   * plain prints `text`. What belongs on it — and why its wording is frozen once shipped — is the
   * render-command-output skill (.agents/skills/render-command-output/SKILL.md).
   */
  plain?: (item: T) => string;
  /**
   * The keys json/toon keep, so a machine format carries what the text line shows instead of the
   * whole API payload. A verbose view lists the keys its extra columns come from, which is how
   * `--verbose` reaches json/toon. Left off, the item serializes whole (it already is the payload:
   * a path, a progress row, a merge summary).
   */
  keys?: readonly (keyof T & string)[];
};

/**
 * Values keep their raw shape — the view owns display shaping — so this only narrows the key set.
 * Missing keys become null rather than vanishing, so a list stays uniform (toon tabulates it).
 */
function pickKeys<T>(item: T, keys?: readonly (keyof T & string)[]): unknown {
  if (!keys || item === null || typeof item !== 'object') {
    return item;
  }

  return Object.fromEntries(keys.map((key) => [key, item[key] ?? null]));
}

export function createOutput(options: GlobalOptions, { withGuide = false }: OutputOptions = {}) {
  const format = resolveOutputFormat(options.output);

  enableColors(options.colors && format === 'text');

  updateSettings({
    // Guide lines off by default; interactive commands (init) opt back in
    withGuide,
  });

  const isStructured = isStructuredFormat(format);

  function renderLine<T>(item: T, view: View<T>): string {
    return format === 'plain' && view.plain ? view.plain(item) : view.text(item);
  }

  /**
   * Diagnostics go to stderr in every format, so stdout only ever carries the result document —
   * a command that warns about three files and then fails still leaves parseable output behind.
   *
   * They used to print to stdout, and warnings were dropped outside text entirely, so `--output`
   * consumers silently lost every 'project doesn't contain the file' notice.
   */
  function diagnostic(level: 'error' | 'warning', message: string, code?: number): void {
    // One record per diagnostic, not one document per run: they are emitted as they happen, so
    // buffering to exit would lose every warning a killed upload had already produced. json
    // separates records by newline, toon by blank line; both escape newlines inside a message,
    // so neither separator can appear within a record. TOON's list form would give one document
    // but declares its record count up front ('[2]{level,message}:'), unknowable mid-run.
    if (isStructured) {
      const record = { level, message, ...(code !== undefined ? { code } : {}) };

      // Not formatData for json: it indents for readability on stdout, which would spread one
      // record over several lines and take the newline separator with it.
      console.error(format === 'toon' ? `${formatData(record, format)}\n` : JSON.stringify(record));
      return;
    }

    // plain drops the symbol for the same reason its views do: the line is the contract. This
    // one departs from Java, whose top-level handler prints ERROR.withIcon() to stderr without
    // ever seeing the plainView flag, so '--plain' there still carries the icon.
    if (format === 'plain') {
      console.error(message);
      return;
    }

    const symbol = level === 'error' ? colors.red(S_ERROR) : colors.yellow(S_WARN);

    console.error(`${symbol}  ${message}`);
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
     * A grid whose rows are not keyed by anything unique — `context status --by-file`, where two
     * branches hold the same path. Bun.inspect.table keys rows by object property, so duplicates
     * would collapse; console-table-printer takes a row list and prints every one of them.
     */
    grid({ columns, rows }: TableGrid): void {
      if (format === 'text') {
        const table = new Table({
          columns,
          shouldDisableColors: !options.colors,
          // The library paints every cell white, which reads as grey next to the rest of the output.
          // An unmapped colour renders as plain text, so dropping 'white' leaves cells in the
          // terminal's own foreground with only the header bold — what Bun.inspect.table does in
          // table() above.
          colorMap: { white: undefined },
        });

        table.addRows(rows);
        console.log(table.render());
        return;
      }

      // json/toon serialize the row list; plain is the caller's own business, as in table() below.
      if (isStructured) {
        console.log(formatData(rows, format));
      }
    },
    /**
     * A genuinely 2-D grid, which in this CLI is only `status` (languages × translated/proofread).
     * Everything else renders one line per entity through list()/item().
     */
    table(data: object | unknown[]): void {
      if (format === 'text') {
        // console.table bolds its header row on a TTY with no way to opt out, so --no-colors
        // leaked styling through it. Bun.inspect.table renders the same grid and takes the flag.
        // trimEnd because the rendered grid ends in a newline and console.log adds its own.
        console.log(Bun.inspect.table(data, { colors: options.colors }).trimEnd());
        return;
      }

      // json/toon serialize the grid; plain is the caller's own business — status prints its
      // per-language report there and never reaches this.
      if (isStructured) {
        console.log(formatData(data, format));
      }
    },
    /**
     * A list of entities: one rendered line each in text and plain, the items themselves in
     * json/toon. `items` is the machine contract, so it carries raw values — the view owns
     * every bit of display shaping.
     */
    list<T>(items: T[], view: View<T>, { empty }: { empty?: string } = {}): void {
      if (isStructured) {
        console.log(
          formatData(
            items.map((item) => pickKeys(item, view.keys)),
            format,
          ),
        );
        return;
      }

      if (format === 'plain') {
        for (const item of items) {
          console.log(renderLine(item, view));
        }

        return;
      }

      if (items.length === 0) {
        if (empty) {
          this.info(empty);
        }

        return;
      }

      for (const item of items) {
        console.log(`${colors.cyan(S_SUCCESS)}  ${renderLine(item, view)}`);
      }
    },
    /**
     * A single value: the rendered view in text and plain, the value itself in json/toon.
     *
     * `mark` puts the success symbol in front, which suits an echo after a mutation ("branch
     * created") but not a report block, whose view renders many lines from one payload.
     */
    item<T>(value: T, view: View<T>, { mark = true }: { mark?: boolean } = {}): void {
      if (isStructured) {
        console.log(formatData(pickKeys(value, view.keys), format));
        return;
      }

      const line = renderLine(value, view);

      if (mark && format === 'text') {
        console.log(`${colors.cyan(S_SUCCESS)}  ${line}`);
        return;
      }

      console.log(line);
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
    /**
     * `code` is the process exit code, so a machine consumer reading stderr does not have to
     * shell out to `$?` to tell a missing file from a failed build. Only the top-level handler
     * knows it; call sites inside commands leave it off.
     */
    error(message: string, { code }: { code?: number } = {}): void {
      diagnostic('error', message, code);
    },
    warning(message: string): void {
      diagnostic('warning', message);
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
        this.spinners[identifier] = spinner(options.colors ? {} : { output: uncoloredStdout });
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

/**
 * `--output` carries no default, so an unset flag arrives as undefined — commands that branch on
 * the format ask here rather than comparing to 'text' and missing the default case.
 */
export function resolveOutputFormat(format?: string): 'json' | 'toon' | 'text' | 'plain' {
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
    // command action, where parsing may have thrown. Mirrors Java's originalArgs().contains("--debug").
    debug: argv.includes('--debug'),
  };
}

export type Output = ReturnType<typeof createOutput>;
