import { cancel, intro, outro, S_ERROR, S_INFO, S_SUCCESS, S_WARN, type SpinnerResult, spinner } from '@clack/prompts';
import { Table } from 'console-table-printer';
import { BaseOutput, type DiagnosticLevel, type SpinnerOperation, type TableGrid, type View } from './BaseOutput.ts';
import { colors } from './colors.ts';

export class TextOutput extends BaseOutput {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: ESC is what an SGR sequence starts with
  private static readonly SGR_SEQUENCE = /\u001b\[[0-9;]*m/g;

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
  static readonly uncoloredStdout = new Proxy(process.stdout, {
    get(target, property) {
      if (property !== 'write') {
        return Reflect.get(target, property, target);
      }

      return (chunk: unknown, ...rest: unknown[]) =>
        (target.write as (...args: unknown[]) => boolean)(
          typeof chunk === 'string' ? chunk.replace(TextOutput.SGR_SEQUENCE, '') : chunk,
          ...rest,
        );
    },
  });

  private readonly spinners: Record<string, SpinnerResult> = {};

  override intro(message: string): void {
    intro(message);
  }

  override outro(message: string): void {
    outro(message);
  }

  override cancel(message: string): void {
    cancel(message);
  }

  override log(data: string): void {
    console.log(data);
  }

  override success(message: string): void {
    console.log(`${colors.green(S_SUCCESS)}  ${message}`);
  }

  override info(message: string): void {
    console.log(`${colors.blue(S_INFO)}  ${message}`);
  }

  grid({ columns, rows }: TableGrid): void {
    const table = new Table({
      columns,
      shouldDisableColors: !this.options.colors,
      // The library paints every cell white, which reads as grey next to the rest of the output.
      // An unmapped colour renders as plain text, leaving cells in the terminal's own foreground
      // with only the header bold, as table() does.
      colorMap: { white: undefined },
    });

    table.addRows(rows);

    console.log(table.render());
  }

  table(data: object | unknown[]): void {
    // Not console.table: it bolds the header row on a TTY and ignores --no-colors.
    // trimEnd because the rendered grid ends in a newline and console.log adds its own.
    console.log(Bun.inspect.table(data, { colors: this.options.colors }).trimEnd());
  }

  list<T>(items: T[], view: View<T>, { empty }: { empty?: string } = {}): void {
    if (items.length === 0) {
      if (empty) {
        this.info(empty);
      }

      return;
    }

    for (const item of items) {
      console.log(`${colors.cyan(S_SUCCESS)}  ${view.text(item)}`);
    }
  }

  item<T>(value: T, view: View<T>, { mark = true }: { mark?: boolean } = {}): void {
    console.log(mark ? `${colors.cyan(S_SUCCESS)}  ${view.text(value)}` : view.text(value));
  }

  override spinner(identifier: string, operation: SpinnerOperation, message: string): void {
    if (!this.options.progress) {
      super.spinner(identifier, operation, message);
      return;
    }

    if (!this.spinners[identifier]) {
      this.spinners[identifier] = spinner(this.options.colors ? {} : { output: TextOutput.uncoloredStdout });
    }

    // clack hardcodes the spinner's error symbol (S_STEP_ERROR); clear it and
    // render our own symbol line instead so error styling stays consistent.
    if (operation === 'error') {
      this.spinners[identifier].clear();
      this.error(message);
      return;
    }

    this.spinners[identifier][operation](message);
  }

  protected diagnosticLine(level: DiagnosticLevel, message: string): string {
    const symbol = level === 'error' ? colors.red(S_ERROR) : colors.yellow(S_WARN);
    return `${symbol}  ${message}`;
  }
}
