import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { rm } from 'node:fs/promises';
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
    // The pseudo-build's target language is derived server-side purely from
    // `character_transformation` (crowdin-backend `Pseudolocalization::LANGUAGE_TO_TRANSFORMATION`:
    // none -> en, asian -> zh-TW, european -> fr, cyrillic -> uk, arabic -> ar) - independent of the
    // project's configured target languages (confirmed by reading `PseudoExport.php`, which builds a
    // `language` object straight from that mapping). But the CLI's local archive-to-path mapping for
    // `--pseudo` downloads (`DownloadCommand.translationsAction`) only ever iterates
    // `project.data.targetLanguages` (src-next/cli/commands/download/DownloadCommand.ts ~L279-284),
    // so a pseudo language that isn't a real target of the project would never get mapped/extracted
    // locally. Using a non-English source lets `en` join `uk`/`zh-TW`/`fr`/`ar` as real targets,
    // sidestepping that gap entirely - the original PHP test never had to worry about this because
    // it ran against the old Java CLI.
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

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'sources/android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads pseudo translations with all parameters (cyrillic transformation)', async () => {
    await switchConfig(ctx, 'all-params');
    await clearDownloadedTranslations(ctx);

    const result = await ctx.runner.run(['download', 'translations', '--pseudo']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Building pseudo translations');
    expect(result.stdout).toContain('Downloading translations');
    expect(result.stdout).toContain('File translations/uk/android.xml extracted');
    expect(normalize(result.stdout)).toMatchSnapshot();

    await assertDownloadedMatches(ctx, 'uk', 'all_params');
  });

  test('downloads pseudo translations with asian character transformation', async () => {
    await switchConfig(ctx, 'asian');
    await clearDownloadedTranslations(ctx);

    const result = await ctx.runner.run(['download', 'translations', '--pseudo']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('File translations/zh/android.xml extracted');
    expect(normalize(result.stdout)).toMatchSnapshot();

    await assertDownloadedMatches(ctx, 'zh', 'asian');
  });

  test('downloads pseudo translations with european character transformation', async () => {
    await switchConfig(ctx, 'european');
    await clearDownloadedTranslations(ctx);

    const result = await ctx.runner.run(['download', 'translations', '--pseudo']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('File translations/fr/android.xml extracted');
    expect(normalize(result.stdout)).toMatchSnapshot();

    await assertDownloadedMatches(ctx, 'fr', 'european');
  });

  test('downloads pseudo translations with arabic character transformation', async () => {
    await switchConfig(ctx, 'arabic');
    await clearDownloadedTranslations(ctx);

    const result = await ctx.runner.run(['download', 'translations', '--pseudo']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('File translations/ar/android.xml extracted');
    expect(normalize(result.stdout)).toMatchSnapshot();

    await assertDownloadedMatches(ctx, 'ar', 'arabic');
  });

  test('downloads pseudo translations with length correction only', async () => {
    await switchConfig(ctx, 'length-correction');
    await clearDownloadedTranslations(ctx);

    const result = await ctx.runner.run(['download', 'translations', '--pseudo']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('File translations/en/android.xml extracted');
    expect(normalize(result.stdout)).toMatchSnapshot();

    await assertDownloadedMatches(ctx, 'en', 'length_correction');
  });

  test('downloads pseudo translations with prefix only', async () => {
    await switchConfig(ctx, 'prefix');
    await clearDownloadedTranslations(ctx);

    const result = await ctx.runner.run(['download', 'translations', '--pseudo']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('File translations/en/android.xml extracted');
    expect(normalize(result.stdout)).toMatchSnapshot();

    await assertDownloadedMatches(ctx, 'en', 'prefix');
  });

  test('downloads pseudo translations with suffix only', async () => {
    await switchConfig(ctx, 'suffix');
    await clearDownloadedTranslations(ctx);

    const result = await ctx.runner.run(['download', 'translations', '--pseudo']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('File translations/en/android.xml extracted');
    expect(normalize(result.stdout)).toMatchSnapshot();

    await assertDownloadedMatches(ctx, 'en', 'suffix');
  });

  test('downloads pseudo translations using default settings when pseudo_localization is absent', async () => {
    await switchConfig(ctx, 'no-pseudo-section');
    await clearDownloadedTranslations(ctx);

    const result = await ctx.runner.run(['download', 'translations', '--pseudo']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('File translations/en/android.xml extracted');
    expect(normalize(result.stdout)).toMatchSnapshot();

    await assertDownloadedMatches(ctx, 'en', 'default');
  });

  test('rejects an unknown character_transformation value', async () => {
    await switchConfig(ctx, 'invalid-enum');

    const result = await ctx.runner.run(['download', 'translations', '--pseudo']);

    expect(result.exitCode).toBe(2);
    expect(result.stdout).toContain('Invalid option: expected one of "asian"|"european"|"arabic"|"cyrillic"');
    expect(result.stdout).toContain('at pseudoLocalization.character_transformation');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('rejects a prefix of the wrong type', async () => {
    await switchConfig(ctx, 'invalid-prefix-type');

    const result = await ctx.runner.run(['download', 'translations', '--pseudo']);

    expect(result.exitCode).toBe(2);
    expect(result.stdout).toContain('Invalid input: expected string, received number');
    expect(result.stdout).toContain('at pseudoLocalization.prefix');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('rejects a length_correction outside the -50..100 range', async () => {
    await switchConfig(ctx, 'invalid-length-out-of-range');

    const result = await ctx.runner.run(['download', 'translations', '--pseudo']);

    expect(result.exitCode).toBe(2);
    expect(result.stdout).toContain('Too big: expected number to be <=100');
    expect(result.stdout).toContain('at pseudoLocalization.length_correction');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });
});
