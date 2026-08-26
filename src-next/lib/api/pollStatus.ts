import type { ResponseObject } from '@crowdin/crowdin-api-client';
import CliError from '@/cli/errors/CliError.ts';

/**
 * What every Crowdin async job reports while it runs, whether the endpoint returns a `Status<T>`
 * (keyed by `identifier`) or a build (keyed by a numeric `id`). Keeping the constraint this narrow
 * is what lets both kinds share one wait.
 */
export interface PollableStatus {
  status: string;
  progress: number;
}

export async function pollUntilFinished<T extends PollableStatus>(
  initial: ResponseObject<T>,
  // Receives the latest status rather than just an id, so `Status<T>` callers can destructure
  // `identifier` while build callers close over the build id they already hold.
  poll: (current: T) => Promise<ResponseObject<T>>,
  // A function when the message depends on the failure itself (a build carries `error.message`).
  failureMessage: string | ((current: T) => string),
  // Called with each polled status so callers can report progress the way Java's
  // executeAsyncActionWithoutSpinner does. Not called for a failed status, which raises instead.
  onProgress?: (status: T) => void,
): Promise<ResponseObject<T>> {
  let current = initial;

  // Case-insensitive: some endpoints return "finished"/"failed", others capitalize (e.g. bundle export).
  // `canceled` is terminal too (BuildStatus is created|inProgress|canceled|failed|finished), so it
  // has to end the loop — waiting for a cancelled job to reach "finished" never returns. Java shares
  // this gap and hangs; ending the wait is a deliberate divergence.
  const isFailure = (status: string) => status === 'failed' || status === 'canceled';

  while (current.data.status.toLowerCase() !== 'finished') {
    if (isFailure(current.data.status.toLowerCase())) {
      throw new CliError(typeof failureMessage === 'string' ? failureMessage : failureMessage(current.data));
    }

    await Bun.sleep(1000);

    current = await poll(current.data);

    if (!isFailure(current.data.status.toLowerCase())) {
      onProgress?.(current.data);
    }
  }

  return current;
}
