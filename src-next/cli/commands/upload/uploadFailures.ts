import type { Output } from '@/cli/utils/output.ts';

// Java's UploadSources/UploadTranslations actions run every file, then fail with this generic
// message if any individual upload errored (error.execution_contains_errors).
export const EXECUTION_FINISHED_WITH_ERRORS = 'Current execution finished with errors';

/**
 * Reports each rejected task (so per-file failures are visible) and returns whether any failed.
 * Mirrors Java, which keeps processing every file and only aggregates the failure at the end.
 */
export function reportFailures(results: PromiseSettledResult<unknown>[], output: Output): boolean {
  const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');

  for (const failure of failures) {
    output.error(failure.reason instanceof Error ? failure.reason.message : String(failure.reason));
  }

  return failures.length > 0;
}
