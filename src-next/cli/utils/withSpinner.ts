import type CliError from '@/cli/errors/CliError.ts';
import { toCliError } from '@/cli/errors/toCliError.ts';
import type { Output } from '@/cli/utils/output.ts';

export interface SpinnerMessages<T> {
  start: string;
  /** A function when the finished message depends on the result (an identifier, a count, …). */
  stop: string | ((result: T) => string);
  /** Prefix for the failure; the API's own message is appended by `toCliError`. */
  fail: string;
}

/**
 * Runs an operation behind a spinner, mirroring Java's ConsoleSpinner.execute.
 *
 * On failure the spinner line carries the *full* `CliError` message — the `fail` prefix plus
 * whatever the API said — and the error is marked `reported`, so `cli.ts` does not print it a
 * second time. Services used to split between this and showing a short fixed line while leaving
 * `reported` unset, which made half of them print the failure twice.
 */
export async function withSpinner<T>(
  output: Output,
  key: string,
  messages: SpinnerMessages<T>,
  operation: () => Promise<T>,
): Promise<T> {
  output.spinner(key, 'start', messages.start);

  try {
    const result = await operation();

    output.spinner(key, 'stop', typeof messages.stop === 'string' ? messages.stop : messages.stop(result));

    return result;
  } catch (error) {
    const cliError: CliError = toCliError(error, messages.fail);

    output.spinner(key, 'error', cliError.message);
    cliError.reported = true;

    throw cliError;
  }
}
