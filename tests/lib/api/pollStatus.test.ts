import { beforeAll, describe, expect, spyOn, test } from 'bun:test';
import { pollUntilFinished } from '@/lib/api/pollStatus.ts';

// The helper sleeps a second between polls; nothing here depends on real time.
beforeAll(() => {
  spyOn(Bun, 'sleep').mockResolvedValue(undefined as never);
});

const status = (value: string, progress = 0) => ({ data: { identifier: 'job-1', status: value, progress } }) as never;

describe('pollUntilFinished', () => {
  test('returns once the job reports finished', async () => {
    const responses = [status('inProgress'), status('finished', 100)];
    const result = await pollUntilFinished(status('created'), async () => responses.shift() as never, 'boom');

    expect(result.data.status).toBe('finished');
  });

  test('throws on a failed status', () => {
    expect(pollUntilFinished(status('failed'), async () => status('failed'), 'boom')).rejects.toThrow('boom');
  });

  // BuildStatus is created|inProgress|canceled|failed|finished. `canceled` is terminal, so a loop
  // that only watches for finished/failed polls a cancelled job forever.
  test('throws on a canceled status instead of polling forever', () => {
    expect(pollUntilFinished(status('canceled'), async () => status('canceled'), 'boom')).rejects.toThrow('boom');
  });

  test('throws when the job is cancelled partway through', () => {
    const responses = [status('inProgress'), status('canceled')];

    expect(pollUntilFinished(status('created'), async () => responses.shift() as never, 'boom')).rejects.toThrow(
      'boom',
    );
  });

  test('reports progress for non-terminal statuses only', async () => {
    const responses = [status('inProgress', 50), status('finished', 100)];
    const seen: string[] = [];

    await pollUntilFinished(
      status('created'),
      async () => responses.shift() as never,
      'boom',
      (current) => seen.push(current.status),
    );

    expect(seen).toEqual(['inProgress', 'finished']);
  });
});
