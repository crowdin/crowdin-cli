import { BaseOutput, type TableGrid, type View } from './BaseOutput.ts';

// One line per entity, no symbols or colours: the line is the contract.
export class PlainOutput extends BaseOutput {
  // Grids and tables have no line form; a command that needs one in plain prints its own lines.
  grid(_grid: TableGrid): void {}

  table(_data: object | unknown[]): void {}

  list<T>(items: T[], view: View<T>): void {
    for (const item of items) {
      console.log(this.line(item, view));
    }
  }

  item<T>(value: T, view: View<T>): void {
    console.log(this.line(value, view));
  }

  protected diagnosticLine(_level: string, message: string): string {
    return message;
  }

  private line<T>(item: T, view: View<T>): string {
    return view.plain ? view.plain(item) : view.text(item);
  }
}
