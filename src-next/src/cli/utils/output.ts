import { cancel, intro, log, outro, type SpinnerResult, spinner } from '@clack/prompts';
import { formatData, type OutputFormat } from './formatter.ts';

export function createOutput(format: OutputFormat = 'text') {
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
    log(data: unknown, config?: { showAsTable?: boolean; tableProperties?: string[] }): void {
      if (format !== 'text') {
        if (config?.showAsTable) {
          console.log(this.format(data));
          return;
        }

        console.log(this.format({ message: data }));
        return;
      }

      if (config?.showAsTable) {
        console.table(data, config.tableProperties);
        return;
      }

      log.message(data as string);
    },
    success(message: string): void {
      if (format !== 'text') {
        console.log(this.format({ success: message }));
        return;
      }

      log.success(message);
    },
    info(message: string): void {
      if (format !== 'text') {
        console.log(this.format({ info: message }));
        return;
      }

      log.info(message);
    },
    error(message: string): void {
      if (format !== 'text') {
        console.log(this.format({ error: message }));
        return;
      }

      log.error(message);
    },
    warning(message: string): void {
      if (format !== 'text') {
        console.log(this.format({ warning: message }));
        return;
      }

      log.warning(message);
    },
    format(data: unknown): string {
      return formatData(data, format);
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
