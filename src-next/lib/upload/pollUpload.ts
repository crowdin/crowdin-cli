import type { ResponseObject, Status } from '@crowdin/crowdin-api-client';
import CliError from '@/cli/errors/CliError.ts';

export async function pollUntilFinished<T>(
  initial: ResponseObject<Status<T>>,
  poll: (uploadId: string) => Promise<ResponseObject<Status<T>>>,
  failureMessage: string,
): Promise<ResponseObject<Status<T>>> {
  let current = initial;

  while (current.data.status !== 'finished') {
    if (current.data.status === 'failed') {
      throw new CliError(failureMessage);
    }

    await Bun.sleep(1000);
    current = await poll(current.data.identifier);
  }

  return current;
}
