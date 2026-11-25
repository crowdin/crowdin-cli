import { encode } from '@toon-format/toon';
import { BaseOutput, type DiagnosticLevel, type TableGrid, type View } from './BaseOutput.ts';
import type { StructuredFormat } from './format.ts';

// json and toon: stdout carries one document, the result.
export class StructuredOutput extends BaseOutput {
  declare readonly format: StructuredFormat;

  grid({ rows }: TableGrid): void {
    this.write(rows);
  }

  table(data: object | unknown[]): void {
    this.write(data);
  }

  list<T>(items: T[], view: View<T>): void {
    this.write(items.map((item) => this.pickKeys(item, view.keys)));
  }

  item<T>(value: T, view: View<T>): void {
    this.write(this.pickKeys(value, view.keys));
  }

  // The failure reaches stderr through the top-level handler, whose record carries the exit code.
  override spinner(): void {}

  protected diagnosticLine(level: DiagnosticLevel, message: string, code?: number): string {
    // One record per diagnostic, emitted as it happens, so a killed run keeps the warnings it
    // already produced. json separates records by newline, toon by blank line; both escape newlines
    // inside a message, so neither separator can appear within a record. TOON's list form is out:
    // it declares its record count up front ('[2]{level,message}:'), unknowable mid-run.
    const record = { level, message, ...(code !== undefined ? { code } : {}) };

    // Not serialize() for json: it indents for readability on stdout, which would spread one
    // record over several lines and take the newline separator with it.
    return this.format === 'toon' ? `${this.serialize(record)}\n` : JSON.stringify(record);
  }

  private write(data: unknown): void {
    console.log(this.serialize(data));
  }

  private serialize(data: unknown): string {
    return this.format === 'toon' ? encode(data) : JSON.stringify(data, null, 2);
  }

  /**
   * Values keep their raw shape — the view owns display shaping — so this only narrows the key set.
   * Missing keys become null rather than vanishing, so a list stays uniform (toon tabulates it).
   */
  private pickKeys<T>(item: T, keys?: readonly (keyof T & string)[]): unknown {
    if (!keys || item === null || typeof item !== 'object') {
      return item;
    }

    return Object.fromEntries(keys.map((key) => [key, item[key] ?? null]));
  }
}
