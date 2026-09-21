import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { expectFailure } from '../helpers/cli.ts';
import { clearDir, expectFilesMatch } from '../helpers/files.ts';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, switchConfig, teardownSuite } from '../helpers/suite.ts';

/** Run before a config switch, so the next `upload sources` recreates every file under the new group(s). */
async function deleteAllProjectFiles(ctx: SuiteContext): Promise<void> {
  const files = await ctx.client.sourceFilesApi.listProjectFiles(ctx.project.id);
  for (const file of files.data) {
    await ctx.client.sourceFilesApi.deleteFile(ctx.project.id, file.data.id);
  }
}

describe('excluded languages', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    ctx = await setupSuite('excluded-languages', { targetLanguageIds: ['it', 'uk', 'de'] });
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('uploads sources excluding a language via the CLI flag', async () => {
    const result = await ctx.runner.run(['upload', 'sources', '--excluded-language', 'de']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads translations, skipping the language with no local files', async () => {
    const result = await ctx.runner.run(['upload', 'translations']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stderr).toContain("File 'translations/de/1_android.xml' does not exist in the specified location");
    expect(result.stderr).toContain("File 'translations/de/2_android.xml' does not exist in the specified location");
    expect(result.stdout).toContain("File 'translations/it/1_android.xml'");
    expect(result.stdout).toContain("File 'translations/it/2_android.xml'");
    expect(result.stdout).toContain("File 'translations/uk/1_android.xml'");
    expect(result.stdout).toContain("File 'translations/uk/2_android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('lists configured translation files for every target language regardless of exclusions', async () => {
    const result = await ctx.runner.run(['config', 'translations']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain('translations/de/1_android.xml');
    expect(result.stdout).toContain('translations/it/1_android.xml');
    expect(result.stdout).toContain('translations/uk/1_android.xml');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations, building only the non-excluded languages', async () => {
    const result = await ctx.runner.run(['download', 'translations']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesMatch(
      ctx.workspace,
      'translations',
      'expected',
      'it/1_android.xml',
      'it/2_android.xml',
      'uk/1_android.xml',
      'uk/2_android.xml',
    );
    expect(await Bun.file(join(ctx.workspace, 'translations/de/1_android.xml')).exists()).toBe(false);
  });

  test('changes the excluded language via a new CLI flag value', async () => {
    const result = await ctx.runner.run(['upload', 'sources', '--excluded-language', 'it']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('re-uploads translations, rejecting the newly excluded language', async () => {
    const result = await ctx.runner.run(['upload', 'translations']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stderr).toContain("File 'translations/de/1_android.xml' does not exist in the specified location");
    expect(result.stderr).toContain("File 'translations/de/2_android.xml' does not exist in the specified location");
    expect(result.stderr).toContain(
      "Translation file 'translations/it/1_android.xml' hasn't been uploaded since the following target " +
        'language(s) are not enabled for the source file in your Crowdin project',
    );
    expect(result.stdout).toContain("File 'translations/uk/1_android.xml'");
    expect(result.stdout).toContain("File 'translations/uk/2_android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations after the excluded language changed', async () => {
    // Cleared first: `download translations` leaves files from a previous run, so a language
    // excluded this run would still "exist".
    await clearDir(ctx.workspace, 'translations');
    const result = await ctx.runner.run(['download', 'translations']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(normalize(result.stdout)).toMatchSnapshot();

    expect(await Bun.file(join(ctx.workspace, 'translations/de/1_android.xml')).exists()).toBe(true);
    expect(await Bun.file(join(ctx.workspace, 'translations/uk/1_android.xml')).exists()).toBe(true);
    expect(await Bun.file(join(ctx.workspace, 'translations/it/1_android.xml')).exists()).toBe(false);
  });

  test('uploads sources without the CLI flag, leaving the exclusion unchanged', async () => {
    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations, exclusion unchanged since the flag was omitted', async () => {
    await clearDir(ctx.workspace, 'translations');
    const result = await ctx.runner.run(['download', 'translations']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(normalize(result.stdout)).toMatchSnapshot();

    // Omitting --excluded-language does not clear a previously-set exclusion (only an explicit
    // value replaces it), so 'it' is still excluded here even though this run passed no flag.
    expect(await Bun.file(join(ctx.workspace, 'translations/de/1_android.xml')).exists()).toBe(true);
    expect(await Bun.file(join(ctx.workspace, 'translations/uk/1_android.xml')).exists()).toBe(true);
    expect(await Bun.file(join(ctx.workspace, 'translations/it/1_android.xml')).exists()).toBe(false);
  });

  test('uploads sources with exclusion declared in the config file', async () => {
    await deleteAllProjectFiles(ctx);
    await switchConfig(ctx, 'crowdin-excluded-languages');

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations honoring the config-declared exclusion', async () => {
    await clearDir(ctx.workspace, 'translations');
    const result = await ctx.runner.run(['download', 'translations']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(normalize(result.stdout)).toMatchSnapshot();

    expect(await Bun.file(join(ctx.workspace, 'translations/de/1_android.xml')).exists()).toBe(true);
    expect(await Bun.file(join(ctx.workspace, 'translations/uk/1_android.xml')).exists()).toBe(true);
    expect(await Bun.file(join(ctx.workspace, 'translations/it/1_android.xml')).exists()).toBe(false);
  });

  test('uploads sources merging the config exclusion with the CLI flag', async () => {
    await deleteAllProjectFiles(ctx);

    const result = await ctx.runner.run(['upload', 'sources', '--excluded-language', 'de']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations honoring the merged config+CLI exclusion', async () => {
    await clearDir(ctx.workspace, 'translations');
    const result = await ctx.runner.run(['download', 'translations']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(normalize(result.stdout)).toMatchSnapshot();

    // Both the config's 'it' and the CLI flag's 'de' are excluded (merged, not overridden).
    expect(await Bun.file(join(ctx.workspace, 'translations/uk/1_android.xml')).exists()).toBe(true);
    expect(await Bun.file(join(ctx.workspace, 'translations/it/1_android.xml')).exists()).toBe(false);
    expect(await Bun.file(join(ctx.workspace, 'translations/de/1_android.xml')).exists()).toBe(false);
  });

  test('uploads sources with per-file exclusions across two file groups', async () => {
    await deleteAllProjectFiles(ctx);
    await switchConfig(ctx, 'crowdin-two-groups');

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations honoring per-file exclusions', async () => {
    await clearDir(ctx.workspace, 'translations');
    const result = await ctx.runner.run(['download', 'translations']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(normalize(result.stdout)).toMatchSnapshot();

    // 1_android.xml excludes 'it' -> de/uk only. 2_android.xml excludes 'uk' -> de/it only.
    expect(await Bun.file(join(ctx.workspace, 'translations/de/1_android.xml')).exists()).toBe(true);
    expect(await Bun.file(join(ctx.workspace, 'translations/uk/1_android.xml')).exists()).toBe(true);
    expect(await Bun.file(join(ctx.workspace, 'translations/it/1_android.xml')).exists()).toBe(false);
    expect(await Bun.file(join(ctx.workspace, 'translations/de/2_android.xml')).exists()).toBe(true);
    expect(await Bun.file(join(ctx.workspace, 'translations/it/2_android.xml')).exists()).toBe(true);
    expect(await Bun.file(join(ctx.workspace, 'translations/uk/2_android.xml')).exists()).toBe(false);
  });

  test('rejects an excluded language that does not exist in the project', async () => {
    const result = await ctx.runner.run(['upload', 'sources', '--excluded-language', 'ar']);

    expectFailure(result, 1, "Project doesn't have 'ar' language(s)");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });
});
