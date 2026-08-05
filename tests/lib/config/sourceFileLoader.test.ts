import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { LanguagesModel, ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import SourceFileLoader from '@/lib/config/sourceFileLoader.ts';
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

describe('SourceFileLoader', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'crowdin-source-loader-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  // Exercised through the public API: file placeholders in `ignore` are expanded per scanned
  // source file (Java PlaceholderUtil.format), so a pattern can match files it names indirectly.
  describe('file placeholders in ignore patterns', () => {
    test('passes through patterns without file placeholders', async () => {
      await Bun.write(`${tempDir}/a/app.json`, '{}');
      await Bun.write(`${tempDir}/a/skip.json`, '{}');

      const loader = new SourceFileLoader(buildConfig(tempDir, {}));

      expect(loader.getFilePathsForPattern('/**/*.json', ['**/skip.json'])).toEqual(['a/app.json']);
    });

    test('expands each file placeholder per source file', async () => {
      await Bun.write(`${tempDir}/res/values/strings.xml`, '<x/>');
      await Bun.write(`${tempDir}/res/values/other.xml`, '<x/>');

      const loader = new SourceFileLoader(buildConfig(tempDir, {}));

      // The pattern rebuilds each file's own path, so every scanned file ignores itself.
      expect(loader.getFilePathsForPattern('/**/*.xml', ['%original_path%/%file_name%.%file_extension%'])).toEqual([]);
    });

    test('resolves %original_path% to empty for top-level files', async () => {
      await Bun.write(`${tempDir}/app.json`, '{}');
      await Bun.write(`${tempDir}/skip-app.json`, '{}');

      const loader = new SourceFileLoader(buildConfig(tempDir, {}));

      // Expands to '/skip-app.json'; the leading separator must not stop it matching a root file.
      expect(loader.getFilePathsForPattern('/*.json', ['%original_path%/skip-%file_name%.json'])).toEqual(['app.json']);
    });
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

  test('excludes files matching an ignore pattern with file placeholders', async () => {
    // Java parity: file placeholders resolve per scanned source file (the pre-filter list), so
    // every file under backup/ names itself into the expanded ignore set and is excluded.
    await Bun.write(`${tempDir}/strings.xml`, '<x/>');
    await Bun.write(`${tempDir}/backup/strings.xml`, '<x/>');
    await Bun.write(`${tempDir}/backup/other.xml`, '<x/>');

    const loader = new SourceFileLoader(buildConfig(tempDir, {}));

    expect(loader.getFilePathsForPattern('/**/*.xml', ['backup/%original_file_name%'])).toEqual(['strings.xml']);
  });

  test('combines language and file placeholders in one ignore pattern', async () => {
    await Bun.write(`${tempDir}/strings.xml`, '<x/>');
    await Bun.write(`${tempDir}/uk_strings.xml`, '<x/>');

    const loader = new SourceFileLoader(buildConfig(tempDir, {}));
    const ukrainian = { id: 'uk', twoLettersCode: 'uk' } as LanguagesModel.Language;

    expect(
      loader.getFilePathsForPattern('/**/*.xml', ['%two_letters_code%_%file_name%.%file_extension%'], {
        languages: [ukrainian],
      }),
    ).toEqual(['strings.xml']);
  });

  test('expands a language placeholder in an ignore pattern using a mapped locale', async () => {
    await Bun.write(`${tempDir}/messages.po`, '{}');
    await Bun.write(`${tempDir}/messages-ukrainian.po`, '{}');

    const loader = new SourceFileLoader(buildConfig(tempDir, { source: '/*.po', ignore: ['*-%locale%.po'] }));
    const ukrainian = { id: 'ua', locale: 'uk' } as LanguagesModel.Language;

    // Without the language mapping override, %locale% resolves to the raw locale ('uk') and
    // 'messages-ukrainian.po' would not match the ignore pattern.
    expect(loader.getFilePathsForPattern('/*.po', ['*-%locale%.po'], { languages: [ukrainian] }).sort()).toEqual(
      ['messages-ukrainian.po', 'messages.po'].sort(),
    );

    // With a language mapping overriding 'locale' to 'ukrainian', the ignore pattern excludes it.
    expect(
      loader
        .getFilePathsForPattern('/*.po', ['*-%locale%.po'], {
          languages: [ukrainian],
          serverLanguageMapping: { ua: { locale: 'ukrainian' } } as unknown as ProjectsGroupsModel.LanguageMapping,
        })
        .sort(),
    ).toEqual(['messages.po']);
  });
});
