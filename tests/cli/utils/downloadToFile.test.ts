import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import CliError from '@/cli/errors/CliError.ts';
import { downloadToFile } from '@/cli/utils/downloadToFile.ts';

describe('downloadToFile', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'crowdin-download-to-file-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
    mock.restore();
  });

  test('writes the body to the destination', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValue(new Response('file content'));
    const destination = join(tempDir, 'nested', 'file.txt');

    await downloadToFile('https://example.test/file.txt', destination);

    expect(await Bun.file(destination).text()).toBe('file content');
  });

  test('leaves no part file behind', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValue(new Response('file content'));

    await downloadToFile('https://example.test/file.txt', join(tempDir, 'file.txt'));

    expect(await readdir(tempDir)).toEqual(['file.txt']);
  });

  // Bun on Windows rejects `mkdir('.', { recursive: true })` with EEXIST, which is what a bare
  // file name resolves to — every relative download failed there.
  test('writes to a bare file name in the current directory', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValue(new Response('file content'));
    const cwd = process.cwd();
    process.chdir(tempDir);

    try {
      await downloadToFile('https://example.test/file.txt', 'file.txt');
    } finally {
      process.chdir(cwd);
    }

    expect(await Bun.file(join(tempDir, 'file.txt')).text()).toBe('file content');
  });

  // Covers both arms of the mkdir guard the Windows fix added: an existing path is swallowed and
  // the failure surfaces from the write instead, while any other errno is rethrown as-is.
  test('swallows EEXIST from mkdir and fails on the write', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValue(new Response('file content'));
    const blocker = join(tempDir, 'blocker');
    await writeFile(blocker, 'not a directory');

    expect(downloadToFile('https://example.test/file.txt', join(blocker, 'file.txt'))).rejects.toThrow(/ENOTDIR/);
  });

  test('rethrows other mkdir failures', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValue(new Response('file content'));
    const blocker = join(tempDir, 'blocker');
    await writeFile(blocker, 'not a directory');

    expect(downloadToFile('https://example.test/file.txt', join(blocker, 'nested', 'file.txt'))).rejects.toThrow(
      /ENOTDIR/,
    );
  });

  test('throws CliError for a failed request', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValue(new Response('<Error/>', { status: 403 }));

    expect(downloadToFile('https://example.test/file.txt', join(tempDir, 'file.txt'))).rejects.toThrow(
      new CliError('Download failed with status 403'),
    );
  });

  // A body cut short still ends the stream cleanly, so without the length check the truncated file
  // would be renamed over a good local one.
  test('rejects a body shorter than content-length', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValue(new Response('short', { headers: { 'content-length': '4096' } }));

    expect(downloadToFile('https://example.test/file.txt', join(tempDir, 'file.txt'))).rejects.toThrow(
      new CliError('Download is incomplete: got 5 of 4096 bytes'),
    );
  });

  test('keeps the previous file when the download fails', async () => {
    const destination = join(tempDir, 'file.txt');
    await writeFile(destination, 'previous content');
    spyOn(globalThis, 'fetch').mockResolvedValue(new Response('short', { headers: { 'content-length': '4096' } }));

    await downloadToFile('https://example.test/file.txt', destination).catch(() => {});

    expect(await Bun.file(destination).text()).toBe('previous content');
    expect(await readdir(tempDir)).toEqual(['file.txt']);
  });
});
