import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, switchConfig, teardownSuite } from '../helpers/suite.ts';

/**
 * Every valid pseudo-localization test downloads to `translations/<language>/android.xml`, and the
 * three "no character_transformation" cases plus the default-settings case all share the same
 * `en` destination. Clear it before each download so a would-be failed/omitted extraction can't be
 * masked by a stale file left over from an earlier test at the same path.
 */
async function clearDownloadedTranslations(ctx: SuiteContext): Promise<void> {
  await rm(join(ctx.workspace, 'translations'), { recursive: true, force: true });
}

async function assertDownloadedMatches(ctx: SuiteContext, language: string, expectedFolder: string): Promise<void> {
  const downloaded = await Bun.file(join(ctx.workspace, 'translations', language, 'android.xml')).text();
  const expected = await Bun.file(join(ctx.workspace, 'expected', expectedFolder, 'android.xml')).text();
  expect(downloaded).toBe(expected);
}

describe('download pseudo', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    // The pseudo build's language comes from `character_transformation` alone (none -> en, asian ->
    // zh-TW, european -> fr, cyrillic -> uk, arabic -> ar), but the CLI only maps archive entries for
    // the project's own target languages. A non-English source language lets `en` be a real target
    // too, so every transformation has somewhere to land.
    ctx = await setupSuite('download-pseudo', {
      sourceLanguageId: 'de',
      targetLanguageIds: ['en', 'uk', 'zh-TW', 'fr', 'ar'],
    });
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('uploads the single source file', async () => {
    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("File 'android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads pseudo translations with all parameters (cyrillic transformation)', async () => {
    await switchConfig(ctx, 'all-params');
    await clearDownloadedTranslations(ctx);

    const result = await ctx.runner.run(['download', 'translations', '--pseudo']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain('Building pseudo translations');
    expect(result.stdout).toContain('Downloading translations');
    expect(result.stdout).toContain("File 'translations/uk/android.xml' extracted");
    expect(normalize(result.stdout)).toMatchSnapshot();

    await assertDownloadedMatches(ctx, 'uk', 'all_params');
  });

  test('downloads pseudo translations with asian character transformation', async () => {
    await switchConfig(ctx, 'asian');
    await clearDownloadedTranslations(ctx);

    const result = await ctx.runner.run(['download', 'translations', '--pseudo']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("File 'translations/zh/android.xml' extracted");
    expect(normalize(result.stdout)).toMatchSnapshot();

    await assertDownloadedMatches(ctx, 'zh', 'asian');
  });

  test('downloads pseudo translations with european character transformation', async () => {
    await switchConfig(ctx, 'european');
    await clearDownloadedTranslations(ctx);

    const result = await ctx.runner.run(['download', 'translations', '--pseudo']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("File 'translations/fr/android.xml' extracted");
    expect(normalize(result.stdout)).toMatchSnapshot();

    await assertDownloadedMatches(ctx, 'fr', 'european');
  });

  test('downloads pseudo translations with arabic character transformation', async () => {
    await switchConfig(ctx, 'arabic');
    await clearDownloadedTranslations(ctx);

    const result = await ctx.runner.run(['download', 'translations', '--pseudo']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("File 'translations/ar/android.xml' extracted");
    expect(normalize(result.stdout)).toMatchSnapshot();

    await assertDownloadedMatches(ctx, 'ar', 'arabic');
  });

  test('downloads pseudo translations with length correction only', async () => {
    await switchConfig(ctx, 'length-correction');
    await clearDownloadedTranslations(ctx);

    const result = await ctx.runner.run(['download', 'translations', '--pseudo']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("File 'translations/en/android.xml' extracted");
    expect(normalize(result.stdout)).toMatchSnapshot();

    await assertDownloadedMatches(ctx, 'en', 'length_correction');
  });

  test('downloads pseudo translations with prefix only', async () => {
    await switchConfig(ctx, 'prefix');
    await clearDownloadedTranslations(ctx);

    const result = await ctx.runner.run(['download', 'translations', '--pseudo']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("File 'translations/en/android.xml' extracted");
    expect(normalize(result.stdout)).toMatchSnapshot();

    await assertDownloadedMatches(ctx, 'en', 'prefix');
  });

  test('downloads pseudo translations with suffix only', async () => {
    await switchConfig(ctx, 'suffix');
    await clearDownloadedTranslations(ctx);

    const result = await ctx.runner.run(['download', 'translations', '--pseudo']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("File 'translations/en/android.xml' extracted");
    expect(normalize(result.stdout)).toMatchSnapshot();

    await assertDownloadedMatches(ctx, 'en', 'suffix');
  });

  test('downloads pseudo translations using default settings when pseudo_localization is absent', async () => {
    await switchConfig(ctx, 'no-pseudo-section');
    await clearDownloadedTranslations(ctx);

    const result = await ctx.runner.run(['download', 'translations', '--pseudo']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("File 'translations/en/android.xml' extracted");
    expect(normalize(result.stdout)).toMatchSnapshot();

    await assertDownloadedMatches(ctx, 'en', 'default');
  });

  test('rejects an unknown character_transformation value', async () => {
    await switchConfig(ctx, 'invalid-enum');

    const result = await ctx.runner.run(['download', 'translations', '--pseudo']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('Invalid option: expected one of "asian"|"european"|"arabic"|"cyrillic"');
    // The offending key is not asserted: config errors report the message only, `issue.path` having
    // been dropped when the pretty-printer was replaced.
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('rejects a prefix of the wrong type', async () => {
    await switchConfig(ctx, 'invalid-prefix-type');

    const result = await ctx.runner.run(['download', 'translations', '--pseudo']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('Invalid input: expected string, received number');
    // The offending key is not asserted: config errors report the message only, `issue.path` having
    // been dropped when the pretty-printer was replaced.
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('rejects a length_correction outside the -50..100 range', async () => {
    await switchConfig(ctx, 'invalid-length-out-of-range');

    const result = await ctx.runner.run(['download', 'translations', '--pseudo']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('Too big: expected number to be <=100');
    // The offending key is not asserted: config errors report the message only, `issue.path` having
    // been dropped when the pretty-printer was replaced.
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  // Every run above passes `--pseudo` alone; these pair it with the other download flags. The
  // schema-failure tests leave an invalid config behind, so each of these switches first.
  test('previews a pseudo download without writing anything', async () => {
    await switchConfig(ctx, 'cyrillic');
    await clearDownloadedTranslations(ctx);

    const result = await ctx.runner.run(['download', 'translations', '--pseudo', '--dryrun']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain('translations/uk/android.xml');
    expect(await Bun.file(join(ctx.workspace, 'translations/uk/android.xml')).exists()).toBe(false);
  });

  test('maps the pseudo archive against every project language, ignoring --language', async () => {
    await switchConfig(ctx, 'cyrillic');
    await clearDownloadedTranslations(ctx);

    // `-l fr` narrows a normal download to French. A pseudo build has one language of its own -
    // cyrillic means uk - and is mapped against every project language rather than the resolved
    // set (DownloadCommand.ts:410), so uk still lands despite naming a different language here.
    const result = await ctx.runner.run(['download', 'translations', '--pseudo', '-l', 'fr']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("File 'translations/uk/android.xml' extracted");
    expect(await Bun.file(join(ctx.workspace, 'translations/uk/android.xml')).exists()).toBe(true);
  });

  test('builds pseudo translations for a branch', async () => {
    await switchConfig(ctx, 'cyrillic');
    await clearDownloadedTranslations(ctx);

    const upload = await ctx.runner.run(['upload', 'sources', '-b', 'pseudo-branch']);

    expect(upload).toMatchObject({ exitCode: 0 });

    // The branch id is the one field a pseudo build carries beyond the localization settings.
    const result = await ctx.runner.run(['download', 'translations', '--pseudo', '-b', 'pseudo-branch']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("File 'translations/uk/android.xml' extracted");
  });

  test('still builds pseudo translations when the config sets export options', async () => {
    await switchConfig(ctx, 'export-only-approved');
    await clearDownloadedTranslations(ctx);

    // Nothing here is approved, so a normal download of this config falls back to the source text.
    const normal = await ctx.runner.run(['download', 'translations']);

    expect(normal).toMatchObject({ exitCode: 0 });
    expect(await Bun.file(join(ctx.workspace, 'translations/uk/android.xml')).text()).toContain('first string');

    // Also the only reachable case of the omitted report's second list: archive entries matching
    // no project source, the sibling of the warning translations-not-match covers.
    expect(normal.stderr).toContain('Due to missing respective sources, the following translations will be omitted:');

    await clearDownloadedTranslations(ctx);

    // A pseudo build is a single all-files request carrying no export options
    // (DownloadCommand.ts:560), so the same config yields transformed text instead of the source.
    const pseudo = await ctx.runner.run(['download', 'translations', '--pseudo']);

    expect(pseudo).toMatchObject({ exitCode: 0 });
    expect(pseudo.stdout).toContain("File 'translations/uk/android.xml' extracted");
    expect(await Bun.file(join(ctx.workspace, 'translations/uk/android.xml')).text()).not.toContain('first string');
  });
});
