import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { copyFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { writeConfig } from '../helpers/config.ts';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/** Overwrites the workspace's `crowdin.yml` with one of the `alt-configs/<name>.yml` templates. */
async function switchConfig(ctx: SuiteContext, name: string): Promise<void> {
  const template = await Bun.file(join(ctx.workspace, 'alt-configs', `${name}.yml`)).text();
  await writeConfig(ctx.workspace, template, { projectId: ctx.project.id, token: ctx.env.token as string });
}

/**
 * `download translations` only writes the languages/files included in the current build - it never
 * removes stale files from a previous download. Several tests below download a strict subset of an
 * earlier test's file set (e.g. only `it/1_android.xml` after a run that produced all four files), so
 * the destination is cleared first, mirroring the PHP original's own
 * `Common::RecursivelyRemoveDirectory($this->tmp('translations'))` calls at the same points.
 */
async function clearDownloadedTranslations(ctx: SuiteContext): Promise<void> {
  await rm(join(ctx.workspace, 'translations'), { recursive: true, force: true });
}

/** Compares each downloaded `translations/<file>` against the matching `expected/<folder>/<file>` fixture. */
async function expectDownloadedFilesMatch(ctx: SuiteContext, expectedFolder: string, files: string[]): Promise<void> {
  for (const file of files) {
    const actual = await Bun.file(join(ctx.workspace, 'translations', file)).text();
    const expected = await Bun.file(join(ctx.workspace, 'expected', expectedFolder, file)).text();
    expect(actual).toBe(expected);
  }
}

describe('export options', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    ctx = await setupSuite('export-options', { targetLanguageIds: ['it', 'uk'] });
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('uploads sources for both files', async () => {
    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'sources/1_android.xml'");
    expect(result.stdout).toContain("File 'sources/2_android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();

    const configResult = await ctx.runner.run(['config', 'sources']);

    expect(configResult.exitCode).toBe(0);
    expect(configResult.stdout).toContain('1_android.xml');
    expect(configResult.stdout).toContain('2_android.xml');
  });

  test('reports no fully translated files when skipping untranslated files via the CLI flag, before any translations exist', async () => {
    const result = await ctx.runner.run(['download', 'translations', '--skip-untranslated-files']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(
      "Couldn't find any file to download. Since you are using the 'Skip untranslated files' option, please " +
        'make sure you have fully translated files',
    );
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('reports no fully translated files when skip_untranslated_files is set in config, before any translations exist', async () => {
    await switchConfig(ctx, 'skip-untranslated-files');

    const result = await ctx.runner.run(['download', 'translations']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(
      "Couldn't find any file to download. Since you are using the 'Skip untranslated files' option, please " +
        'make sure you have fully translated files',
    );
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads translations for both languages', async () => {
    // Revert to the plain config - the previous test left `skip_untranslated_files: true` in place,
    // which would otherwise silently force every later "plain" download to skip untranslated files too.
    await switchConfig(ctx, 'base');

    const result = await ctx.runner.run(['upload', 'translations']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'translations/it/1_android.xml'");
    expect(result.stdout).toContain("File 'translations/it/2_android.xml'");
    expect(result.stdout).toContain("File 'translations/uk/1_android.xml'");
    expect(result.stdout).toContain("File 'translations/uk/2_android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('approves translations by re-uploading the approved fixtures with auto-approve', async () => {
    await copyFile(
      join(ctx.workspace, 'translations-approved/it/1_android.xml'),
      join(ctx.workspace, 'translations/it/1_android.xml'),
    );
    await copyFile(
      join(ctx.workspace, 'translations-approved/it/2_android.xml'),
      join(ctx.workspace, 'translations/it/2_android.xml'),
    );
    await copyFile(
      join(ctx.workspace, 'translations-approved/uk/1_android.xml'),
      join(ctx.workspace, 'translations/uk/1_android.xml'),
    );
    await copyFile(
      join(ctx.workspace, 'translations-approved/uk/2_android.xml'),
      join(ctx.workspace, 'translations/uk/2_android.xml'),
    );

    const result = await ctx.runner.run(['upload', 'translations', '--auto-approve-imported']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'translations/it/1_android.xml'");
    expect(result.stdout).toContain("File 'translations/it/2_android.xml'");
    expect(result.stdout).toContain("File 'translations/uk/1_android.xml'");
    expect(result.stdout).toContain("File 'translations/uk/2_android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations skipping untranslated strings via the CLI flag', async () => {
    await clearDownloadedTranslations(ctx);

    const result = await ctx.runner.run(['download', 'translations', '--skip-untranslated-strings']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectDownloadedFilesMatch(ctx, 'skip-strings', [
      'it/1_android.xml',
      'it/2_android.xml',
      'uk/1_android.xml',
      'uk/2_android.xml',
    ]);
  });

  test('downloads translations skipping untranslated files via the CLI flag', async () => {
    await clearDownloadedTranslations(ctx);

    const result = await ctx.runner.run(['download', 'translations', '--skip-untranslated-files']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectDownloadedFilesMatch(ctx, 'skip-files', ['it/1_android.xml', 'uk/1_android.xml']);
  });

  test('downloads translations exporting only approved translations via the CLI flag', async () => {
    await clearDownloadedTranslations(ctx);

    const result = await ctx.runner.run(['download', 'translations', '--export-only-approved']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectDownloadedFilesMatch(ctx, 'approved', [
      'it/1_android.xml',
      'it/2_android.xml',
      'uk/1_android.xml',
      'uk/2_android.xml',
    ]);
  });

  test('downloads translations skipping untranslated strings and exporting only approved via CLI flags', async () => {
    await clearDownloadedTranslations(ctx);

    const result = await ctx.runner.run([
      'download',
      'translations',
      '--skip-untranslated-strings',
      '--export-only-approved',
    ]);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectDownloadedFilesMatch(ctx, 'skip-strings-approved', [
      'it/1_android.xml',
      'it/2_android.xml',
      'uk/1_android.xml',
      'uk/2_android.xml',
    ]);
  });

  test('downloads translations skipping untranslated files and exporting only approved via CLI flags', async () => {
    await clearDownloadedTranslations(ctx);

    const result = await ctx.runner.run([
      'download',
      'translations',
      '--skip-untranslated-files',
      '--export-only-approved',
    ]);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();

    // uk/1_android.xml is 100% translated and approved, so skipping untranslated *files* and skipping
    // untranslated *strings* converge on the same output for it (see the fixture note in the PHP
    // original - both combos reuse `expected/skip-strings-approved` for this exact file).
    await expectDownloadedFilesMatch(ctx, 'skip-strings-approved', ['uk/1_android.xml']);
  });

  test('rejects skipping untranslated strings and files at the same time', async () => {
    const result = await ctx.runner.run([
      'download',
      'translations',
      '--skip-untranslated-strings',
      '--skip-untranslated-files',
    ]);

    // Java/PHP report exit code 2 for this validation error; DownloadCommand.ts throws a plain
    // CliError with no explicit exit code, which defaults to ExitCode.GENERIC (1) - a real divergence
    // from the original CLI, not a porting simplification (see DownloadCommand.ts:376-380).
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain(
      'You cannot skip strings and files at the same time. Please use one of these parameters instead.',
    );
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations with skip_untranslated_strings set in config', async () => {
    await clearDownloadedTranslations(ctx);
    await switchConfig(ctx, 'skip-untranslated-strings');

    const result = await ctx.runner.run(['download', 'translations']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectDownloadedFilesMatch(ctx, 'skip-strings', [
      'it/1_android.xml',
      'it/2_android.xml',
      'uk/1_android.xml',
      'uk/2_android.xml',
    ]);
  });

  test('downloads translations with skip_untranslated_files set in config', async () => {
    await clearDownloadedTranslations(ctx);
    await switchConfig(ctx, 'skip-untranslated-files');

    const result = await ctx.runner.run(['download', 'translations']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectDownloadedFilesMatch(ctx, 'skip-files', ['it/1_android.xml', 'uk/1_android.xml']);
  });

  test('downloads translations with export_only_approved set in config', async () => {
    await clearDownloadedTranslations(ctx);
    await switchConfig(ctx, 'export-only-approved');

    const result = await ctx.runner.run(['download', 'translations']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectDownloadedFilesMatch(ctx, 'approved', [
      'it/1_android.xml',
      'it/2_android.xml',
      'uk/1_android.xml',
      'uk/2_android.xml',
    ]);
  });

  test('downloads translations with skip_untranslated_strings and export_only_approved set in config', async () => {
    await clearDownloadedTranslations(ctx);
    await switchConfig(ctx, 'skip-strings-approved');

    const result = await ctx.runner.run(['download', 'translations']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectDownloadedFilesMatch(ctx, 'skip-strings-approved', [
      'it/1_android.xml',
      'it/2_android.xml',
      'uk/1_android.xml',
      'uk/2_android.xml',
    ]);
  });

  test('downloads translations with skip_untranslated_files and export_only_approved set in config', async () => {
    await clearDownloadedTranslations(ctx);
    await switchConfig(ctx, 'skip-files-approved');

    const result = await ctx.runner.run(['download', 'translations']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectDownloadedFilesMatch(ctx, 'skip-strings-approved', ['uk/1_android.xml']);
  });

  test('warns and ignores export_strings_that_passed_workflow outside Enterprise', async () => {
    await switchConfig(ctx, 'passed-workflow');

    const result = await ctx.runner.run(['download', 'translations']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Exporting strings that passed workflow is supported only for Crowdin Enterprise');
    expect(result.stdout).toContain('File translations/it/1_android.xml extracted');
    expect(result.stdout).toContain('File translations/it/2_android.xml extracted');
    expect(result.stdout).toContain('File translations/uk/1_android.xml extracted');
    expect(result.stdout).toContain('File translations/uk/2_android.xml extracted');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations across two file groups with different export options in config', async () => {
    await clearDownloadedTranslations(ctx);
    await switchConfig(ctx, 'two-groups');

    const result = await ctx.runner.run(['download', 'translations']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('File translations/it/1_android.xml extracted');
    expect(result.stdout).toContain('File translations/uk/1_android.xml extracted');
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectDownloadedFilesMatch(ctx, 'skip-strings-approved', ['it/1_android.xml', 'uk/1_android.xml']);

    // 2_android.xml has skip_untranslated_files set in its group and is not fully translated in
    // either language, so it is omitted from both language builds entirely.
    expect(await Bun.file(join(ctx.workspace, 'translations/it/2_android.xml')).exists()).toBe(false);
    expect(await Bun.file(join(ctx.workspace, 'translations/uk/2_android.xml')).exists()).toBe(false);
  });
});
