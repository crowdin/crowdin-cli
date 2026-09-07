import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { decode } from '@toon-format/toon';
import { expectFilesExist } from '../helpers/files.ts';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, switchConfig, teardownSuite } from '../helpers/suite.ts';

/**
 * Ported from `crowdin-backend/tests/Cli/Common/CliTranslationsNotMatchTest.php`.
 *
 * The mismatch is manufactured: `sources/java.properties` is created straight through the API, so it
 * carries no `exportPattern`, while the `sources/*.xml` files are uploaded through the CLI and get
 * one. The config's `source:` pattern is then narrowed to a single file before each download, so the
 * build archive holds exports the narrowed config cannot map locally - the `reportOmittedFiles` path
 * this suite exists to exercise.
 *
 * Two behaviors worth knowing while reading the assertions:
 * - Branch upload prints no branch-creation message and uses unprefixed local paths, unlike PHP.
 * - For a file with no `exportPattern`, the archive path depends on how many languages the build
 *   targets: an all-language build needs the `<languageId>/<name>` fallback to disambiguate, a
 *   single-language build does not, so the entry is the bare filename.
 */

describe('translations not match', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    ctx = await setupSuite('translations-not-match');
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('uploads sources, alongside a directly-uploaded file the config never covers', async () => {
    // Mirrors the PHP original's raw `apiV2()->uploadFile()` call: a source file added straight
    // through the API, bypassing the CLI/config entirely. It gets no per-file `exportPattern`, so no
    // later config can ever map it locally - it's the permanent "extra" source the whole suite's
    // mismatch scenario needs.
    const content = new Uint8Array(await Bun.file(join(ctx.workspace, 'sources/java.properties')).arrayBuffer());
    const storage = await ctx.client.uploadStorageApi.addStorage('java.properties', content);
    await ctx.client.sourceFilesApi.createFile(ctx.project.id, { storageId: storage.data.id, name: 'java.properties' });

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Directory 'sources'");
    expect(result.stdout).toContain("File 'sources/1_android.xml'");
    expect(result.stdout).toContain("File 'sources/2_android.xml'");
    expect(result.stdout).toContain("File 'sources/3_android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('attempts to upload translations for all languages (none exist locally)', async () => {
    const result = await ctx.runner.run(['upload', 'translations']);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("File 'translations/it/1_android.xml' does not exist in the specified location");
    expect(result.stderr).toContain("File 'translations/it/2_android.xml' does not exist in the specified location");
    expect(result.stderr).toContain("File 'translations/it/3_android.xml' does not exist in the specified location");
    expect(result.stderr).toContain("File 'translations/uk/1_android.xml' does not exist in the specified location");
    expect(result.stderr).toContain("File 'translations/uk/2_android.xml' does not exist in the specified location");
    expect(result.stderr).toContain("File 'translations/uk/3_android.xml' does not exist in the specified location");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('attempts to upload translations for a single specified language (uk)', async () => {
    const result = await ctx.runner.run(['upload', 'translations', '-l', 'uk']);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("File 'translations/uk/1_android.xml' does not exist in the specified location");
    expect(result.stderr).toContain("File 'translations/uk/2_android.xml' does not exist in the specified location");
    expect(result.stderr).toContain("File 'translations/uk/3_android.xml' does not exist in the specified location");
    expect(result.stdout).not.toContain('translations/it/');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test.each(['json', 'toon'] as const)(
    'keeps stdout a parseable %s document while every warning goes to stderr',
    async (format) => {
      const result = await ctx.runner.run(['upload', 'translations', '-l', 'uk', '--output', format]);

      expect(result.exitCode).toBe(0);

      // stderr is a stream of records, not one document: json separates them with a newline, toon
      // with a blank line. Both escape a newline inside a message, so the split is unambiguous.
      const records = result.stderr
        .trim()
        .split(format === 'json' ? '\n' : '\n\n')
        .map(
          (record) => (format === 'json' ? JSON.parse(record) : decode(record)) as { level: string; message: string },
        );

      expect(records.map((record) => record.level)).toEqual(['warning', 'warning', 'warning']);
      expect(records.map((record) => record.message).sort()).toEqual([
        "File 'translations/uk/1_android.xml' does not exist in the specified location",
        "File 'translations/uk/2_android.xml' does not exist in the specified location",
        "File 'translations/uk/3_android.xml' does not exist in the specified location",
      ]);

      const uploaded = (format === 'json' ? JSON.parse(result.stdout) : decode(result.stdout)) as {
        path: string;
        action: string;
        reason: string | null;
      }[];

      expect(uploaded.map((file) => file.path).sort()).toEqual([
        'translations/uk/1_android.xml',
        'translations/uk/2_android.xml',
        'translations/uk/3_android.xml',
      ]);
      expect(uploaded.every((file) => file.action === 'skipped' && file.reason === 'not found locally')).toBe(true);
    },
  );

  test('previews downloading translations once the config narrows to a single source file (dry run)', async () => {
    await switchConfig(ctx, 'single-file');

    const result = await ctx.runner.run(['download', 'translations', '--dryrun']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('translations/it/1_android.xml');
    expect(result.stdout).toContain('translations/uk/1_android.xml');
    expect(result.stdout).not.toContain('2_android.xml');
    expect(result.stdout).not.toContain('3_android.xml');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('previews the same narrowed dry run as a tree', async () => {
    const result = await ctx.runner.run(['download', 'translations', '--dryrun', '--tree']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations for real, warning about the sources the narrowed config no longer covers', async () => {
    const result = await ctx.runner.run(['download', 'translations']);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain(
      "Downloaded translations don't match the current project configuration. The translations for the " +
        'following sources will be omitted (use --verbose to get the list of the omitted translations):',
    );
    expect(result.stdout).toContain('sources/2_android.xml (2)');
    expect(result.stdout).toContain('sources/3_android.xml (2)');
    expect(result.stdout).toContain('java.properties (2)');
    expect(result.stdout).toContain('Visit the https://crowdin.github.io/crowdin-cli/faq for more details');
    // --verbose is not set here, so the omitted archive paths themselves must NOT be listed.
    expect(result.stdout).not.toContain('translations/it/2_android.xml');
    expect(result.stdout).not.toContain('translations/it/3_android.xml');
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesExist(ctx.workspace, 'translations/it/1_android.xml', 'translations/uk/1_android.xml');
    expect(await Bun.file(join(ctx.workspace, 'translations/it/1_android.xml')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/it/1_android.xml')).text(),
    );
    expect(await Bun.file(join(ctx.workspace, 'translations/uk/1_android.xml')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/uk/1_android.xml')).text(),
    );
  });

  test('downloads translations again with --verbose, listing the omitted translation paths', async () => {
    const result = await ctx.runner.run(['download', 'translations', '--verbose']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('sources/2_android.xml (2)');
    expect(result.stdout).toContain('sources/3_android.xml (2)');
    expect(result.stdout).toContain('java.properties (2)');
    // --verbose additionally lists the concrete omitted archive paths under each source. The XML
    // sources carry the `translations/%two_letters_code%/%original_file_name%` exportPattern set at
    // upload time; `java.properties` (no exportPattern of its own) falls back to a bare
    // `<languageId>/<name>` path.
    expect(result.stdout).toContain('translations/it/2_android.xml');
    expect(result.stdout).toContain('translations/uk/2_android.xml');
    expect(result.stdout).toContain('translations/it/3_android.xml');
    expect(result.stdout).toContain('translations/uk/3_android.xml');
    expect(result.stdout).toContain('it/java.properties');
    expect(result.stdout).toContain('uk/java.properties');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations for a single specified language (uk)', async () => {
    await rm(join(ctx.workspace, 'translations'), { recursive: true, force: true });

    const result = await ctx.runner.run(['download', 'translations', '-l', 'uk']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('sources/2_android.xml (1)');
    expect(result.stdout).toContain('sources/3_android.xml (1)');
    expect(result.stdout).toContain('java.properties (1)');
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesExist(ctx.workspace, 'translations/uk/1_android.xml');
    expect(await Bun.file(join(ctx.workspace, 'translations/uk/1_android.xml')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/uk/1_android.xml')).text(),
    );
  });

  test('downloads translations for a single specified language (uk) with --verbose', async () => {
    await rm(join(ctx.workspace, 'translations'), { recursive: true, force: true });

    const result = await ctx.runner.run(['download', 'translations', '-l', 'uk', '--verbose']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('sources/2_android.xml (1)');
    expect(result.stdout).toContain('sources/3_android.xml (1)');
    expect(result.stdout).toContain('java.properties (1)');
    expect(result.stdout).toContain('translations/uk/2_android.xml');
    expect(result.stdout).toContain('translations/uk/3_android.xml');
    // Unlike the all-languages --verbose run above, a single-language build has no ambiguity to
    // resolve for a file with no custom exportPattern: the server's archive entry for
    // `java.properties` is the bare name, with no `%two_letters_code%`-style prefix.
    expect(result.stdout).toContain('\t\t- java.properties');
    expect(result.stdout).not.toContain('uk/java.properties');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads sources to a brand-new branch', async () => {
    await switchConfig(ctx, 'multi-file');

    const result = await ctx.runner.run(['upload', 'sources', '-b', 'test-branch']);

    expect(result.exitCode).toBe(0);
    // `upload sources -b <branch>` creates/reuses the branch silently (`getOrCreateBranch`) and its
    // success messages use the LOCAL path with no branch prefix - confirmed via `UploadSourcesCommand.ts`,
    // matching this porting effort's established branch-upload wording note. PHP's "Branch 'x'" /
    // "test-branch/sources/..." wording does not apply to the TS CLI.
    expect(result.stdout).toContain("Directory 'sources'");
    expect(result.stdout).toContain("File 'sources/1_android.xml'");
    expect(result.stdout).toContain("File 'sources/2_android.xml'");
    expect(result.stdout).toContain("File 'sources/3_android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations for the branch, with the same configuration mismatch', async () => {
    await rm(join(ctx.workspace, 'translations'), { recursive: true, force: true });
    await switchConfig(ctx, 'single-file');

    const result = await ctx.runner.run(['download', 'translations', '-b', 'test-branch']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('sources/2_android.xml (2)');
    expect(result.stdout).toContain('sources/3_android.xml (2)');
    // `java.properties` lives outside any branch, so a branch-scoped build never includes it - it
    // cannot show up in this report the way it does for the non-branch download above.
    expect(result.stdout).not.toContain('java.properties');
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesExist(ctx.workspace, 'translations/it/1_android.xml', 'translations/uk/1_android.xml');
    expect(await Bun.file(join(ctx.workspace, 'translations/it/1_android.xml')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/it/1_android.xml')).text(),
    );
    expect(await Bun.file(join(ctx.workspace, 'translations/uk/1_android.xml')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/uk/1_android.xml')).text(),
    );
  });

  test('downloads translations for the branch with --verbose', async () => {
    const result = await ctx.runner.run(['download', 'translations', '-b', 'test-branch', '--verbose']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('sources/2_android.xml (2)');
    expect(result.stdout).toContain('sources/3_android.xml (2)');
    expect(result.stdout).not.toContain('java.properties');
    expect(result.stdout).toContain('translations/it/2_android.xml');
    expect(result.stdout).toContain('translations/uk/2_android.xml');
    expect(result.stdout).toContain('translations/it/3_android.xml');
    expect(result.stdout).toContain('translations/uk/3_android.xml');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });
});
