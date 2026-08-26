import { describe, expect, test } from 'bun:test';
import { CrowdinError } from '@crowdin/crowdin-api-client';
import CliError, { ExitCode, getExitCode } from '@/cli/errors/CliError.ts';
import { withSpinner } from '@/cli/utils/withSpinner.ts';

function recorder() {
  const calls: [string, string, string][] = [];
  const output = {
    spinner: (key: string, operation: string, message: string) => {
      calls.push([key, operation, message]);
    },
  } as never;

  return { calls, output };
}

describe('withSpinner', () => {
  test('starts, stops and returns the result', async () => {
    const { calls, output } = recorder();

    const result = await withSpinner(output, 'job', { start: 'Working', stop: 'Done', fail: 'Failed' }, async () => 42);

    expect(result).toBe(42);
    expect(calls).toEqual([
      ['job', 'start', 'Working'],
      ['job', 'stop', 'Done'],
    ]);
  });

  test('derives the stop message from the result when given a function', async () => {
    const { calls, output } = recorder();

    await withSpinner(
      output,
      'job',
      { start: 'Working', stop: (id: string) => `Done (${id})`, fail: 'Failed' },
      async () => 'abc',
    );

    expect(calls.at(-1)).toEqual(['job', 'stop', 'Done (abc)']);
  });

  // The spinner line carries the full message and the error is marked reported, so cli.ts does not
  // print the same failure a second time. Half the services used to skip the flag and double-print.
  test('shows the detailed failure once and marks it reported', async () => {
    const { calls, output } = recorder();

    const failing = withSpinner(output, 'job', { start: 'Working', stop: 'Done', fail: 'Failed to build' }, () => {
      throw new CrowdinError('quota exceeded', 403, {});
    });

    expect(failing).rejects.toThrow('Failed to build. quota exceeded');

    const error = (await failing.catch((thrown: unknown) => thrown)) as CliError;

    expect(calls.at(-1)).toEqual(['job', 'error', 'Failed to build. quota exceeded']);
    expect(error.reported).toBe(true);
  });

  test('keeps the exit code the API status maps to', async () => {
    const { output } = recorder();

    const error = await withSpinner(output, 'job', { start: 'a', stop: 'b', fail: 'Failed' }, () => {
      throw new CrowdinError('nope', 404, {});
    }).catch((thrown: unknown) => thrown);

    expect(getExitCode(error)).toBe(ExitCode.NOT_FOUND);
  });

  test('passes an existing CliError through untouched', async () => {
    const { output } = recorder();
    const original = new CliError('already specific', ExitCode.VALIDATION);

    const error = await withSpinner(output, 'job', { start: 'a', stop: 'b', fail: 'Failed' }, () => {
      throw original;
    }).catch((thrown: unknown) => thrown);

    expect(error).toBe(original);
    expect(getExitCode(error)).toBe(ExitCode.VALIDATION);
  });
});
