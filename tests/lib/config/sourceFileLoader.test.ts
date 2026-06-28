import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import SourceFileLoader, { commonPath } from '@/lib/config/sourceFileLoader.ts';
import { type Config, ConfigSchema } from '@/lib/config.ts';

function buildConfig(
  basePath: string,
  fileOverrides: Record<string, unknown>,
  configOverrides: Record<string, unknown> = {},
): Config {
  return ConfigSchema.parse({
    projectId: 123,
    apiToken: 'a'.repeat(80),
    basePath,
    baseUrl: 'https://api.crowdin.com',
    files: [
      {
        source: '/**/*.json',
        translation: '/locale/%two_letters_code%/%original_file_name%',
        ...fileOverrides,
      },
    ],
    ...configOverrides,
  });
}

describe('commonPath', () => {
  test('returns the shared parent directory with a trailing slash', () => {
    expect(commonPath(['src/foo/a.json', 'src/foo/b.json'])).toBe('src/foo/');
  });

  test('trims back to the last separator when files diverge inside a directory', () => {
    expect(commonPath(['src/foo/a.json', 'src/bar/b.json'])).toBe('src/');
  });

  test('does not strip a partial directory-name match', () => {
    // Raw string prefix is "src/foo", but it must trim to "src/" so "foobar" is not cut mid-name.
    expect(commonPath(['src/foo/a.json', 'src/foobar/b.json'])).toBe('src/');
  });

  test('returns the directory of a single file', () => {
    expect(commonPath(['src/foo/a.json'])).toBe('src/foo/');
  });

  test('returns empty string for top-level files with no shared directory', () => {
    expect(commonPath(['a.json', 'b.json'])).toBe('');
  });

  test('returns empty string for no files', () => {
    expect(commonPath([])).toBe('');
  });
});

describe('SourceFileLoader', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'crowdin-source-loader-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test('excludes hidden files by default (ignore_hidden_files)', async () => {
    await Bun.write(`${tempDir}/app.json`, '{}');
    await Bun.write(`${tempDir}/.hidden.json`, '{}');
    await Bun.write(`${tempDir}/.config/nested.json`, '{}');

    const loader = new SourceFileLoader(buildConfig(tempDir, {}));

    expect(loader.getFilePaths()).toEqual(['app.json']);
  });

  test('includes hidden files when ignore_hidden_files is disabled', async () => {
    await Bun.write(`${tempDir}/app.json`, '{}');
    await Bun.write(`${tempDir}/.hidden.json`, '{}');

    const loader = new SourceFileLoader(buildConfig(tempDir, {}, { ignoreHiddenFiles: false }));

    expect(loader.getFilePaths().sort()).toEqual(['.hidden.json', 'app.json']);
  });

  test('includes files under a hidden directory when ignore_hidden_files is disabled', async () => {
    await Bun.write(`${tempDir}/app.json`, '{}');
    await Bun.write(`${tempDir}/.config/nested.json`, '{}');

    const loader = new SourceFileLoader(buildConfig(tempDir, {}, { ignoreHiddenFiles: false }));

    expect(loader.getFilePaths().sort()).toEqual(['.config/nested.json', 'app.json']);
  });

  test('excludes files matching an ignore pattern', async () => {
    await Bun.write(`${tempDir}/app.json`, '{}');
    await Bun.write(`${tempDir}/skip.json`, '{}');

    const loader = new SourceFileLoader(buildConfig(tempDir, { ignore: ['skip.json'] }));

    expect(loader.getFilePaths()).toEqual(['app.json']);
  });

  test('excludes files under an ignored directory', async () => {
    await Bun.write(`${tempDir}/app.json`, '{}');
    await Bun.write(`${tempDir}/vendor/lib.json`, '{}');

    const loader = new SourceFileLoader(buildConfig(tempDir, { ignore: ['vendor'] }));

    expect(loader.getFilePaths()).toEqual(['app.json']);
  });
});
