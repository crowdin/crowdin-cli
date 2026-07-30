import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { expectFilesExist } from '../helpers/files.ts';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, switchConfig, teardownSuite } from '../helpers/suite.ts';

describe('multilingual csv', () => {
  let ctx: SuiteContext;
  let fileId: number;

  beforeAll(async () => {
    ctx = await setupSuite('multilingual-csv', { targetLanguageIds: ['it', 'uk'] });
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('upload with translations import', async () => {
    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Directory with-translations created');
    expect(result.stdout).toContain("File 'with-translations/sample.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();

    fileId = await findFileId('/with-translations/sample.csv');

    expect(await translationsFor('uk', fileId)).toEqual([
      'стрічка 1',
      'стрічка 2',
      'стрічка 3',
      'стрічка 4',
      'стрічка 5',
    ]);
    expect(await translationsFor('it', fileId)).toEqual([
      'stringa 1',
      'stringa 2',
      'stringa 3',
      'stringa 4',
      'stringa 5',
    ]);
  });

  test('update with translations import', async () => {
    const result = await ctx.runner.run(['upload', 'sources', '--base-path', 'sources/rev2']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'with-translations/sample.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();

    expect(await translationsFor('uk', fileId)).toContainValues(['стрічка 6', 'стрічка 7']);
    expect(await translationsFor('it', fileId)).toContainValues(['stringa 6', 'stringa 7']);
  });

  test('download file with translations (dryrun)', async () => {
    const result = await ctx.runner.run(['download', 'translations', '--dryrun']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('File with-translations/sample.csv extracted');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('download file with translations', async () => {
    const result = await ctx.runner.run(['download', 'translations']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('File with-translations/sample.csv extracted');
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesExist(ctx.workspace, 'sources/rev1/with-translations/sample.csv');

    // syntax in downloaded file is different from source, so we know the file was downloaded
    expect(await Bun.file(join(ctx.workspace, 'sources/rev1/with-translations/sample.csv')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/with-translations/sample.csv')).text(),
    );
  });

  test('upload without translations import', async () => {
    await switchConfig(ctx, 'without-translations');

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Directory without-translations created');
    expect(result.stdout).toContain("File 'without-translations/sample.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();

    fileId = await findFileId('/without-translations/sample.csv');

    expect(await translationsFor('uk', fileId)).toBeEmpty();
    expect(await translationsFor('it', fileId)).toBeEmpty();
  });

  test('update without translations import', async () => {
    const result = await ctx.runner.run(['upload', 'sources', '--base-path', 'sources/rev2']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'without-translations/sample.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();

    expect(await translationsFor('uk', fileId)).toBeEmpty();
    expect(await translationsFor('it', fileId)).toBeEmpty();
  });

  test('upload translations for single language', async () => {
    const result = await ctx.runner.run(['upload', 'translations', '--language', 'uk']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'without-translations/sample.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();

    expect(await translationsFor('uk', fileId)).toEqual([
      'стрічка 1',
      'стрічка 2',
      'стрічка 3',
      'стрічка 4',
      'стрічка 5',
    ]);
  });

  test('upload translations for all languages', async () => {
    const result = await ctx.runner.run(['upload', 'translations']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'without-translations/sample.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();

    expect(await translationsFor('uk', fileId)).toEqual([
      'стрічка 1',
      'стрічка 2',
      'стрічка 3',
      'стрічка 4',
      'стрічка 5',
    ]);
    expect(await translationsFor('it', fileId)).toEqual([
      'stringa 1',
      'stringa 2',
      'stringa 3',
      'stringa 4',
      'stringa 5',
    ]);
  });

  test('upload sources to a brand-new branch', async () => {
    await switchConfig(ctx, 'branch');

    const result = await ctx.runner.run(['upload', 'sources', '--branch', 'test-branch']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'sample.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('update sources in existing branch', async () => {
    const result = await ctx.runner.run([
      'upload',
      'sources',
      '--branch',
      'test-branch',
      '--base-path',
      'sources/rev2/branch',
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'sample.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('upload translations to the branch', async () => {
    const result = await ctx.runner.run([
      'upload',
      'translations',
      '--branch',
      'test-branch',
      '--base-path',
      'sources/rev3/branch',
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Importing translations for file 'sample.csv'");
    expect(result.stdout).toContain("File 'sample.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('download translations from branch', async () => {
    const result = await ctx.runner.run(['download', 'translations', '--branch', 'test-branch']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('File sample.csv extracted');
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesExist(ctx.workspace, 'sources/rev1/branch/sample.csv');

    expect(await Bun.file(join(ctx.workspace, 'sources', 'rev1', 'branch', 'sample.csv')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected', 'branch', 'sample.csv')).text(),
    );
  });

  test('upload source to the root of the project', async () => {
    await switchConfig(ctx, 'project-root');

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'sample.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  async function translationsFor(languageId: string, fileId: number): Promise<(string | null)[]> {
    const response = await ctx.client.stringTranslationsApi.listLanguageTranslations(ctx.project.id, languageId, {
      fileId,
    });
    return response.data.map((entry) => ('text' in entry.data ? entry.data.text : null));
  }

  async function findFileId(projectPath: string): Promise<number> {
    const response = await ctx.client.sourceFilesApi.listProjectFiles(ctx.project.id);
    const match = response.data.find((entry) => entry.data.path === projectPath);

    if (!match) {
      throw new Error(`File '${projectPath}' not found via the API`);
    }

    return match.data.id;
  }
});
