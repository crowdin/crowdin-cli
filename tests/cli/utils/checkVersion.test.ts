import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import os from 'node:os';
import path from 'node:path';
import { checkNewVersion } from '@/cli/utils/checkVersion.ts';
import { createOutput } from '@/cli/utils/output.ts';

const tmpFiles: string[] = [];

function tmpCachePath() {
  const p = path.join(os.tmpdir(), `crowdin-vercheck-${crypto.randomUUID()}.json`);

  tmpFiles.push(p);

  return p;
}

async function writeCacheFile(cachePath: string, cache: { lastCheck: number; latest: string }) {
  await Bun.write(cachePath, JSON.stringify(cache));
}

function fakeOutput() {
  const lines: string[] = [];

  return {
    output: { log: (message: string) => lines.push(message) } as never,
    lines,
  };
}

function mockFetch(impl: () => Promise<Response>) {
  return spyOn(globalThis, 'fetch').mockImplementation(impl as never);
}

describe('checkNewVersion', () => {
  afterEach(async () => {
    spyOn(globalThis, 'fetch').mockRestore();

    for (const p of tmpFiles.splice(0)) {
      await Bun.file(p)
        .unlink()
        .catch(() => {});
    }
  });

  test('prints a banner when the remote version differs', async () => {
    mockFetch(async () => new Response('5.1.0\n'));

    const { output, lines } = fakeOutput();

    await checkNewVersion(output, '5.0.0', { cachePath: tmpCachePath() });

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('5.0.0');
    expect(lines[0]).toContain('5.1.0');
  });

  test('stays silent when the version matches', async () => {
    mockFetch(async () => new Response('5.0.0\n'));

    const { output, lines } = fakeOutput();

    await checkNewVersion(output, '5.0.0', { cachePath: tmpCachePath() });

    expect(lines).toHaveLength(0);
  });

  test('stays silent when the remote version is older (semver)', async () => {
    mockFetch(async () => new Response('4.9.0\n'));

    const { output, lines } = fakeOutput();

    await checkNewVersion(output, '5.0.0', { cachePath: tmpCachePath() });

    expect(lines).toHaveLength(0);
  });

  test('stays silent on an unparseable remote version', async () => {
    mockFetch(async () => new Response('not-a-version\n'));

    const { output, lines } = fakeOutput();

    await checkNewVersion(output, '5.0.0', { cachePath: tmpCachePath() });

    expect(lines).toHaveLength(0);
  });

  test('stays silent on a non-ok response', async () => {
    mockFetch(async () => new Response('nope', { status: 404 }));

    const { output, lines } = fakeOutput();

    await checkNewVersion(output, '5.0.0', { cachePath: tmpCachePath() });

    expect(lines).toHaveLength(0);
  });

  test('stays silent (no throw) when fetch rejects', async () => {
    mockFetch(async () => {
      throw new Error('network down');
    });

    const { output, lines } = fakeOutput();

    await checkNewVersion(output, '5.0.0', { cachePath: tmpCachePath() });

    expect(lines).toHaveLength(0);
  });

  test('suppresses the banner when output format is plain', async () => {
    mockFetch(async () => new Response('5.1.0\n'));

    const log = spyOn(console, 'log').mockImplementation(() => {});
    const output = createOutput({
      output: 'plain',
      colors: false,
      config: '',
      progress: false,
      verbose: false,
    });

    await checkNewVersion(output, '5.0.0', { cachePath: tmpCachePath() });

    expect(log).not.toHaveBeenCalled();

    log.mockRestore();
  });

  test('writes the fetched version to the cache', async () => {
    mockFetch(async () => new Response('5.1.0\n'));

    const cachePath = tmpCachePath();

    await checkNewVersion(fakeOutput().output, '5.0.0', { cachePath });

    const cache = await Bun.file(cachePath).json();

    expect(cache.latest).toBe('5.1.0');
    expect(typeof cache.lastCheck).toBe('number');
  });

  test('serves the banner from a fresh cache without hitting the network', async () => {
    const fetchSpy = mockFetch(async () => new Response('9.9.9\n'));
    const cachePath = tmpCachePath();

    await writeCacheFile(cachePath, { lastCheck: Date.now(), latest: '5.1.0' });

    const { output, lines } = fakeOutput();

    await checkNewVersion(output, '5.0.0', { cachePath });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('5.1.0');
  });

  test('refetches once the cache is older than the TTL', async () => {
    const fetchSpy = mockFetch(async () => new Response('5.2.0\n'));
    const cachePath = tmpCachePath();
    const stale = Date.now() - 48 * 60 * 60 * 1000;

    await writeCacheFile(cachePath, { lastCheck: stale, latest: '5.1.0' });

    const { output, lines } = fakeOutput();

    await checkNewVersion(output, '5.0.0', { cachePath });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(lines[0]).toContain('5.2.0');
  });

  test('falls back to a stale cache when the network fails', async () => {
    mockFetch(async () => {
      throw new Error('offline');
    });

    const cachePath = tmpCachePath();
    const stale = Date.now() - 48 * 60 * 60 * 1000;

    await writeCacheFile(cachePath, { lastCheck: stale, latest: '5.1.0' });

    const { output, lines } = fakeOutput();

    await checkNewVersion(output, '5.0.0', { cachePath });

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('5.1.0');
  });
});
