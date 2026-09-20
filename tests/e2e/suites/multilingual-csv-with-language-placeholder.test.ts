import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { clearDir, expectFilesMatch } from '../helpers/files.ts';
import { normalize } from '../helpers/normalize.ts';
import { restoreConfig, type SuiteContext, setupSuite, switchConfig, teardownSuite } from '../helpers/suite.ts';

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

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("Directory 'sources'");
    expect(result.stdout).toContain("File 'sources/1_multilingual.csv'");
    expect(result.stdout).toContain("File 'sources/2_multilingual.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads translations for every target language', async () => {
    const result = await ctx.runner.run(['upload', 'translations']);

    expect(result).toMatchObject({ exitCode: 0 });
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

    expect(result).toMatchObject({ exitCode: 0 });
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

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain('translations/it/1_multilingual.csv');
    expect(result.stdout).toContain('translations/it/2_multilingual.csv');
    expect(result.stdout).toContain('translations/uk/1_multilingual.csv');
    expect(result.stdout).toContain('translations/uk/2_multilingual.csv');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations and matches the merged multilingual content', async () => {
    // Cleared first: downloads land on the paths the upload fixtures already occupy.
    await clearDir(ctx.workspace, 'translations');

    const result = await ctx.runner.run(['download', 'translations']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("File 'translations/it/1_multilingual.csv' extracted");
    expect(result.stdout).toContain("File 'translations/it/2_multilingual.csv' extracted");
    expect(result.stdout).toContain("File 'translations/uk/1_multilingual.csv' extracted");
    expect(result.stdout).toContain("File 'translations/uk/2_multilingual.csv' extracted");
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesMatch(
      ctx.workspace,
      'translations',
      'expected',
      'it/1_multilingual.csv',
      'it/2_multilingual.csv',
      'uk/1_multilingual.csv',
      'uk/2_multilingual.csv',
    );
  });

  test('updates sources from a new base path, targeting a new translation destination', async () => {
    await switchConfig(ctx, 'crowdin-v2');

    const result = await ctx.runner.run(['upload', 'sources', '--base-path', 'rev2']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("File 'sources/1_multilingual.csv'");
    expect(result.stdout).toContain("File 'sources/2_multilingual.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations at the new translations-v2 destination', async () => {
    const result = await ctx.runner.run(['download', 'translations']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("File 'translations-v2/it/1_multilingual.csv' extracted");
    expect(result.stdout).toContain("File 'translations-v2/it/2_multilingual.csv' extracted");
    expect(result.stdout).toContain("File 'translations-v2/uk/1_multilingual.csv' extracted");
    expect(result.stdout).toContain("File 'translations-v2/uk/2_multilingual.csv' extracted");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads sources to a new branch', async () => {
    await restoreConfig(ctx);

    const result = await ctx.runner.run(['upload', 'sources', '-b', 'test-branch']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("Directory 'sources'");
    expect(result.stdout).toContain("File 'sources/1_multilingual.csv'");
    expect(result.stdout).toContain("File 'sources/2_multilingual.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('updates sources on the branch (branch already exists)', async () => {
    const result = await ctx.runner.run(['upload', 'sources', '-b', 'test-branch']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("File 'sources/1_multilingual.csv'");
    expect(result.stdout).toContain("File 'sources/2_multilingual.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads translations on the branch', async () => {
    const result = await ctx.runner.run(['upload', 'translations', '-b', 'test-branch']);

    expect(result).toMatchObject({ exitCode: 0 });
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
    await clearDir(ctx.workspace, 'translations');

    const result = await ctx.runner.run(['download', 'translations', '-b', 'test-branch']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("File 'translations/it/1_multilingual.csv' extracted");
    expect(result.stdout).toContain("File 'translations/it/2_multilingual.csv' extracted");
    expect(result.stdout).toContain("File 'translations/uk/1_multilingual.csv' extracted");
    expect(result.stdout).toContain("File 'translations/uk/2_multilingual.csv' extracted");
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesMatch(
      ctx.workspace,
      'translations',
      'expected',
      'it/1_multilingual.csv',
      'it/2_multilingual.csv',
      'uk/1_multilingual.csv',
      'uk/2_multilingual.csv',
    );
  });
});
