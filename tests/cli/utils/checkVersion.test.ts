import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { checkNewVersion } from '@/cli/utils/checkVersion.ts';
import { createOutput } from '@/cli/utils/output.ts';

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
  afterEach(() => {
    spyOn(globalThis, 'fetch').mockRestore();
  });

  test('prints a banner when the remote version differs', async () => {
    mockFetch(async () => new Response('5.1.0\n'));
    const { output, lines } = fakeOutput();

    await checkNewVersion(output, '5.0.0');

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('5.0.0');
    expect(lines[0]).toContain('5.1.0');
  });

  test('stays silent when the version matches', async () => {
    mockFetch(async () => new Response('5.0.0\n'));
    const { output, lines } = fakeOutput();

    await checkNewVersion(output, '5.0.0');

    expect(lines).toHaveLength(0);
  });

  test('stays silent on a non-ok response', async () => {
    mockFetch(async () => new Response('nope', { status: 404 }));
    const { output, lines } = fakeOutput();

    await checkNewVersion(output, '5.0.0');

    expect(lines).toHaveLength(0);
  });

  test('stays silent (no throw) when fetch rejects', async () => {
    mockFetch(async () => {
      throw new Error('network down');
    });
    const { output, lines } = fakeOutput();

    await checkNewVersion(output, '5.0.0');

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

    await checkNewVersion(output, '5.0.0');

    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
