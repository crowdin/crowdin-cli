import { cancel, intro, log, outro, type SpinnerResult, spinner } from '@clack/prompts';
import { formatData, type OutputFormat } from './formatter.ts';

export function createOutput(format: OutputFormat = 'text', verbose = false) {
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
      if (format !== 'text') {
        console.debug(formatData(data, format));
        return;
      }

      console.table(data, tableProperties);
    },
    debug(data: string): void {
      if (verbose) {
        this.info(data);
      }
    },
    log(data: unknown): void {
      if (format !== 'text') {
        console.log(formatData({ message: data }, format));
        return;
      }

      log.message(data as string);
    },
    success(message: string): void {
      if (format !== 'text') {
        console.log(formatData({ success: message }, format));
        return;
      }

      log.success(message);
    },
    info(message: string): void {
      if (format !== 'text') {
        console.log(formatData({ info: message }, format));
        return;
      }

      log.info(message);
    },
    error(message: string): void {
      if (format !== 'text') {
        console.log(formatData({ error: message }, format));
        return;
      }

      log.error(message);
    },
    warning(message: string): void {
      if (format !== 'text') {
        console.log(formatData({ warning: message }, format));
        return;
      }

      log.warning(message);
    },
    spinner(
      identifier: string,
      operation: 'start' | 'stop' | 'cancel' | 'error' | 'message' | 'clear',
      message: string,
    ): void {
      if (format !== 'text') {
        if (operation === 'error') {
          this.error(message);
        } else {
          this.log(message);
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

export type Output = ReturnType<typeof createOutput>;
