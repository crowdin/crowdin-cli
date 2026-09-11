import type { Output } from '@/cli/utils/output.ts';

// Every file is attempted, then the run fails with this if any of them failed.
export const EXECUTION_FINISHED_WITH_ERRORS = 'Current execution finished with errors';

export function reportFailures(results: PromiseSettledResult<unknown>[], output: Output): boolean {
  const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');

  for (const failure of failures) {
    output.error(failure.reason instanceof Error ? failure.reason.message : String(failure.reason));
  }

  return failures.length > 0;
}
