import type { GlobalOptions } from '../options.ts';
import type { OutputFormat } from './format.ts';

export type DiagnosticLevel = 'error' | 'warning';

export type SpinnerOperation = 'start' | 'stop' | 'cancel' | 'error' | 'message' | 'clear';

/** A row-list grid: column definitions plus the rows themselves, duplicates and all. */
export type TableGrid = {
  columns: { name: string; title: string; alignment?: 'left' | 'right' }[];
  rows: Record<string, string | number>[];
};

/**
 * How one entity renders per `--output` format: a line in text and plain, a narrowed record in
 * json/toon.
 */
export type View<T> = {
  text: (item: T) => string;
  /**
   * The plain line, when it differs from `text` (e.g. branch prints the name alone); left off,
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

// What a command prints, one subclass per --output format. Chatter (intro, success, info, log) is
// text-only, so it's a no-op here and TextOutput overrides it.
export abstract class BaseOutput {
  constructor(
    readonly format: OutputFormat,
    protected readonly options: GlobalOptions,
  ) {}

  intro(_message: string): void {}

  outro(_message: string): void {}

  cancel(_message: string): void {}

  log(_data: string): void {}

  success(_message: string): void {}

  info(_message: string): void {}

  /**
   * A grid whose rows are not keyed by anything unique — `context status --by-file`, where two
   * branches hold the same path. Bun.inspect.table keys rows by object property, so duplicates
   * would collapse; console-table-printer takes a row list and prints every one of them.
   */
  abstract grid(grid: TableGrid): void;

  /**
   * A genuinely 2-D grid, which in this CLI is only `status` (languages × translated/proofread).
   * Everything else renders one line per entity through list()/item().
   */
  abstract table(data: object | unknown[]): void;

  /**
   * A list of entities: one rendered line each in text and plain, the items themselves in
   * json/toon. `items` is the machine contract, so it carries raw values — the view owns
   * every bit of display shaping.
   */
  abstract list<T>(items: T[], view: View<T>, options?: { empty?: string }): void;

  /**
   * A single value: the rendered view in text and plain, the value itself in json/toon.
   *
   * `mark` puts the success symbol in front, which suits an echo after a mutation ("branch
   * created") but not a report block, whose view renders many lines from one payload.
   */
  abstract item<T>(value: T, view: View<T>, options?: { mark?: boolean }): void;

  debug(data: string): void {
    if (this.options.verbose) {
      this.info(data);
    }
  }

  /**
   * `code` is the process exit code, so a machine consumer reading stderr does not have to
   * shell out to `$?` to tell a missing file from a failed build. Only the top-level handler
   * knows it; call sites inside commands leave it off.
   */
  error(message: string, { code }: { code?: number } = {}): void {
    this.diagnostic('error', message, code);
  }

  warning(message: string): void {
    this.diagnostic('warning', message);
  }

  // Without an animated spinner, its messages become info lines and its failure an error.
  spinner(_identifier: string, operation: SpinnerOperation, message: string): void {
    if (operation === 'error') {
      this.error(message);
    } else {
      this.info(message);
    }
  }

  protected abstract diagnosticLine(level: DiagnosticLevel, message: string, code?: number): string;

  /**
   * Diagnostics go to stderr in every format, so stdout only ever carries the result document —
   * a command that warns about three files and then fails still leaves parseable output behind.
   */
  private diagnostic(level: DiagnosticLevel, message: string, code?: number): void {
    // Not console.error: bun paints the whole line red under FORCE_COLOR, whatever --no-colors says.
    process.stderr.write(`${this.diagnosticLine(level, message, code)}\n`);
  }
}
