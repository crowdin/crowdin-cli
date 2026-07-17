import type { ResponseObject, Status } from '@crowdin/crowdin-api-client';
import CliError from '@/cli/errors/CliError.ts';

export async function pollUntilFinished<T>(
  initial: ResponseObject<Status<T>>,
  poll: (uploadId: string) => Promise<ResponseObject<Status<T>>>,
  failureMessage: string,
  // Called with each polled status so callers can report progress the way Java's
  // executeAsyncActionWithoutSpinner does. Not called for a failed status, which raises instead.
  onProgress?: (status: Status<T>) => void,
): Promise<ResponseObject<Status<T>>> {
  let current = initial;

  // Case-insensitive: some endpoints return "finished"/"failed", others capitalize (e.g. bundle export).
  while (current.data.status.toLowerCase() !== 'finished') {
    if (current.data.status.toLowerCase() === 'failed') {
      throw new CliError(failureMessage);
    }

    await Bun.sleep(1000);

    current = await poll(current.data.identifier);

    if (current.data.status.toLowerCase() !== 'failed') {
      onProgress?.(current.data);
    }
  }

  return current;
}
