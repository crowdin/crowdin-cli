import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, switchConfig, teardownSuite } from '../helpers/suite.ts';

/**
 * `download translations` writes to the exact local path the `upload translations` fixtures
 * already occupy (`translations/<lang>/<file>`), and a stale file left over from an earlier
 * upload/download in this suite could masquerade as a successful download. Clear it first.
 */
async function clearDownloadedTranslations(ctx: SuiteContext): Promise<void> {
  await rm(join(ctx.workspace, 'translations'), { recursive: true, force: true });
}

describe('multilingual csv with language placeholder', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    ctx = await setupSuite('multilingual-csv-with-language-placeholder', { targetLanguageIds: ['it', 'uk'] });
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('uploads multilingual CSV sources', async () => {
    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Directory 'sources'");
    expect(result.stdout).toContain("File 'sources/1_multilingual.csv'");
    expect(result.stdout).toContain("File 'sources/2_multilingual.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads translations for every target language', async () => {
    const result = await ctx.runner.run(['upload', 'translations']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Importing translations for file 'translations/it/1_multilingual.csv'");
    expect(result.stdout).toContain("Importing translations for file 'translations/it/2_multilingual.csv'");
    expect(result.stdout).toContain("Importing translations for file 'translations/uk/1_multilingual.csv'");
    expect(result.stdout).toContain("Importing translations for file 'translations/uk/2_multilingual.csv'");
    expect(result.stdout).toContain("File 'translations/it/1_multilingual.csv'");
    expect(result.stdout).toContain("File 'translations/it/2_multilingual.csv'");
    expect(result.stdout).toContain("File 'translations/uk/1_multilingual.csv'");
    expect(result.stdout).toContain("File 'translations/uk/2_multilingual.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads translations for a single language via --language', async () => {
    const result = await ctx.runner.run(['upload', 'translations', '--language', 'uk']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Importing translations for file 'translations/uk/1_multilingual.csv'");
    expect(result.stdout).toContain("Importing translations for file 'translations/uk/2_multilingual.csv'");
    expect(result.stdout).toContain("File 'translations/uk/1_multilingual.csv'");
    expect(result.stdout).toContain("File 'translations/uk/2_multilingual.csv'");
    expect(result.stdout).not.toContain("Importing translations for file 'translations/it/1_multilingual.csv'");
    expect(result.stdout).not.toContain("Importing translations for file 'translations/it/2_multilingual.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('previews the translation download (dryrun)', async () => {
    const result = await ctx.runner.run(['download', 'translations', '--dryrun']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('translations/it/1_multilingual.csv');
    expect(result.stdout).toContain('translations/it/2_multilingual.csv');
    expect(result.stdout).toContain('translations/uk/1_multilingual.csv');
    expect(result.stdout).toContain('translations/uk/2_multilingual.csv');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations and matches the merged multilingual content', async () => {
    await clearDownloadedTranslations(ctx);

    const result = await ctx.runner.run(['download', 'translations']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'translations/it/1_multilingual.csv' extracted");
    expect(result.stdout).toContain("File 'translations/it/2_multilingual.csv' extracted");
    expect(result.stdout).toContain("File 'translations/uk/1_multilingual.csv' extracted");
    expect(result.stdout).toContain("File 'translations/uk/2_multilingual.csv' extracted");
    expect(normalize(result.stdout)).toMatchSnapshot();

    expect(await Bun.file(join(ctx.workspace, 'translations/it/1_multilingual.csv')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/it/1_multilingual.csv')).text(),
    );
    expect(await Bun.file(join(ctx.workspace, 'translations/it/2_multilingual.csv')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/it/2_multilingual.csv')).text(),
    );
    expect(await Bun.file(join(ctx.workspace, 'translations/uk/1_multilingual.csv')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/uk/1_multilingual.csv')).text(),
    );
    expect(await Bun.file(join(ctx.workspace, 'translations/uk/2_multilingual.csv')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/uk/2_multilingual.csv')).text(),
    );
  });

  test('updates sources from a new base path, targeting a new translation destination', async () => {
    await switchConfig(ctx, 'crowdin-v2');

    const result = await ctx.runner.run(['upload', 'sources', '--base-path', 'rev2']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'sources/1_multilingual.csv'");
    expect(result.stdout).toContain("File 'sources/2_multilingual.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations at the new translations-v2 destination', async () => {
    const result = await ctx.runner.run(['download', 'translations']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'translations-v2/it/1_multilingual.csv' extracted");
    expect(result.stdout).toContain("File 'translations-v2/it/2_multilingual.csv' extracted");
    expect(result.stdout).toContain("File 'translations-v2/uk/1_multilingual.csv' extracted");
    expect(result.stdout).toContain("File 'translations-v2/uk/2_multilingual.csv' extracted");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads sources to a new branch', async () => {
    await switchConfig(ctx, 'crowdin-original');

    const result = await ctx.runner.run(['upload', 'sources', '-b', 'test-branch']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Directory 'sources'");
    expect(result.stdout).toContain("File 'sources/1_multilingual.csv'");
    expect(result.stdout).toContain("File 'sources/2_multilingual.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('updates sources on the branch (branch already exists)', async () => {
    const result = await ctx.runner.run(['upload', 'sources', '-b', 'test-branch']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'sources/1_multilingual.csv'");
    expect(result.stdout).toContain("File 'sources/2_multilingual.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads translations on the branch', async () => {
    const result = await ctx.runner.run(['upload', 'translations', '-b', 'test-branch']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Importing translations for file 'translations/it/1_multilingual.csv'");
    expect(result.stdout).toContain("Importing translations for file 'translations/it/2_multilingual.csv'");
    expect(result.stdout).toContain("Importing translations for file 'translations/uk/1_multilingual.csv'");
    expect(result.stdout).toContain("Importing translations for file 'translations/uk/2_multilingual.csv'");
    expect(result.stdout).toContain("File 'translations/it/1_multilingual.csv'");
    expect(result.stdout).toContain("File 'translations/it/2_multilingual.csv'");
    expect(result.stdout).toContain("File 'translations/uk/1_multilingual.csv'");
    expect(result.stdout).toContain("File 'translations/uk/2_multilingual.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  // Depends on the two branch upload tests above actually having pushed content server-side.
  test('downloads translations on the branch', async () => {
    await clearDownloadedTranslations(ctx);

    const result = await ctx.runner.run(['download', 'translations', '-b', 'test-branch']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'translations/it/1_multilingual.csv' extracted");
    expect(result.stdout).toContain("File 'translations/it/2_multilingual.csv' extracted");
    expect(result.stdout).toContain("File 'translations/uk/1_multilingual.csv' extracted");
    expect(result.stdout).toContain("File 'translations/uk/2_multilingual.csv' extracted");
    expect(normalize(result.stdout)).toMatchSnapshot();

    expect(await Bun.file(join(ctx.workspace, 'translations/it/1_multilingual.csv')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/it/1_multilingual.csv')).text(),
    );
    expect(await Bun.file(join(ctx.workspace, 'translations/it/2_multilingual.csv')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/it/2_multilingual.csv')).text(),
    );
    expect(await Bun.file(join(ctx.workspace, 'translations/uk/1_multilingual.csv')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/uk/1_multilingual.csv')).text(),
    );
    expect(await Bun.file(join(ctx.workspace, 'translations/uk/2_multilingual.csv')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/uk/2_multilingual.csv')).text(),
    );
  });
});
