import { describe, expect, test } from 'bun:test';
import { CROWDIN_API_MAX_CONCURRENT_REQUESTS, runConcurrently } from '@/lib/utils/concurrency.ts';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('runConcurrently', () => {
  test('returns an empty array for no tasks', async () => {
    expect(await runConcurrently([])).toEqual([]);
  });

  test('keeps results in input order despite out-of-order completion', async () => {
    // Later tasks finish first; results must still line up with their input index.
    const tasks = [10, 5, 1].map((ms, i) => async () => {
      await sleep(ms);
      return i;
    });

    const results = await runConcurrently(tasks, 3);

    expect(results.map((r) => (r.status === 'fulfilled' ? r.value : null))).toEqual([0, 1, 2]);
  });

  test('reports fulfilled and rejected per index without throwing', async () => {
    const boom = new Error('boom');
    const tasks = [async () => 'ok', async () => Promise.reject(boom)];

    const results = await runConcurrently(tasks, 2);

    expect(results[0]).toEqual({ status: 'fulfilled', value: 'ok' });
    expect(results[1]).toEqual({ status: 'rejected', reason: boom });
  });

  test('never exceeds the given concurrency limit', async () => {
    let active = 0;
    let peak = 0;
    const tasks = Array.from({ length: 10 }, () => async () => {
      active++;
      peak = Math.max(peak, active);
      await sleep(5);
      active--;
    });

    await runConcurrently(tasks, 3);

    expect(peak).toBeLessThanOrEqual(3);
  });

  test('defaults the limit to CROWDIN_API_MAX_CONCURRENT_REQUESTS', async () => {
    let active = 0;
    let peak = 0;
    const tasks = Array.from({ length: 6 }, () => async () => {
      active++;
      peak = Math.max(peak, active);
      await sleep(5);
      active--;
    });

    await runConcurrently(tasks);

    expect(peak).toBe(CROWDIN_API_MAX_CONCURRENT_REQUESTS);
  });
});
