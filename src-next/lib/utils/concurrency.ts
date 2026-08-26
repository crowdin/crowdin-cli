export const CROWDIN_API_MAX_CONCURRENT_REQUESTS = 4;

export async function runConcurrently<T>(
  tasks: Array<() => Promise<T>>,
  limit = CROWDIN_API_MAX_CONCURRENT_REQUESTS,
): Promise<PromiseSettledResult<T>[]> {
  if (tasks.length === 0) return [];

  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  const active = new Set<Promise<void>>();

  for (let i = 0; i < tasks.length; i++) {
    const index = i;
    const task = tasks[index];

    if (task === undefined) {
      continue;
    }

    const promise: Promise<void> = task()
      .then((value) => {
        results[index] = { status: 'fulfilled', value };
      })
      .catch((reason) => {
        results[index] = { status: 'rejected', reason };
      })
      .finally(() => {
        active.delete(promise);
      });

    active.add(promise);

    if (active.size >= limit) {
      await Promise.race(active);
    }
  }

  await Promise.all(active);

  return results;
}
