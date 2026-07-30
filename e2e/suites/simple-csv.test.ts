import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expectFilesExist } from '../helpers/files.ts';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, switchConfig, teardownSuite } from '../helpers/suite.ts';

describe('simple csv', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    ctx = await setupSuite('simple-csv', { targetLanguageIds: ['it', 'uk'] });
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('uploads sources', async () => {
    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Fetching project info');
    expect(result.stdout).toContain('Directory sources created');
    expect(result.stdout).toContain('Directory files created');
    expect(result.stdout).toContain("File 'sources/files/1_simple.csv'");
    expect(result.stdout).toContain("File 'sources/files/2_simple.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('updates sources after local changes', async () => {
    await copyFile(
      join(ctx.workspace, 'sources_rev2', 'files', '1_simple.csv'),
      join(ctx.workspace, 'sources', 'files', '1_simple.csv'),
    );
    await copyFile(
      join(ctx.workspace, 'sources_rev2', 'files', '2_simple.csv'),
      join(ctx.workspace, 'sources', 'files', '2_simple.csv'),
    );

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'sources/files/1_simple.csv'");
    expect(result.stdout).toContain("File 'sources/files/2_simple.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads translations for every target language', async () => {
    const result = await ctx.runner.run(['upload', 'translations']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Importing translations for file 'sources/files/it/1_simple.csv'");
    expect(result.stdout).toContain("Importing translations for file 'sources/files/it/2_simple.csv'");
    expect(result.stdout).toContain("Importing translations for file 'sources/files/uk/1_simple.csv'");
    expect(result.stdout).toContain("Importing translations for file 'sources/files/uk/2_simple.csv'");
    expect(result.stdout).toContain("File 'sources/files/it/1_simple.csv'");
    expect(result.stdout).toContain("File 'sources/files/it/2_simple.csv'");
    expect(result.stdout).toContain("File 'sources/files/uk/1_simple.csv'");
    expect(result.stdout).toContain("File 'sources/files/uk/2_simple.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads translations for a single language', async () => {
    const result = await ctx.runner.run(['upload', 'translations', '-l', 'uk']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Importing translations for file 'sources/files/uk/1_simple.csv'");
    expect(result.stdout).toContain("Importing translations for file 'sources/files/uk/2_simple.csv'");
    expect(result.stdout).toContain("File 'sources/files/uk/1_simple.csv'");
    expect(result.stdout).toContain("File 'sources/files/uk/2_simple.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  // Currently red on one row: `ident9` declares `max_length` 10 but the uk fixture translates it as
  // 'файл 1 стрічка 9' (16 chars), so Crowdin rejects that translation on import and the download
  // falls back to the source text. `expected/uk/*.csv` still asserts the translated value, while the
  // it-side fixture already encodes the untranslated fallback - the uk expectation looks like the
  // stale one, but confirm which side is wrong before changing either.
  test('downloads translations for a single language', async () => {
    const result = await ctx.runner.run(['download', 'translations', '-l', 'uk']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesExist(ctx.workspace, 'sources/files/uk/1_simple.csv', 'sources/files/uk/2_simple.csv');
    expect(await Bun.file(join(ctx.workspace, 'sources/files/uk/1_simple.csv')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/uk/1_simple.csv')).text(),
    );
    expect(await Bun.file(join(ctx.workspace, 'sources/files/uk/2_simple.csv')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/uk/2_simple.csv')).text(),
    );
  });

  test('downloads translations for every target language', async () => {
    const result = await ctx.runner.run(['download', 'translations']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesExist(
      ctx.workspace,
      'sources/files/it/1_simple.csv',
      'sources/files/it/2_simple.csv',
      'sources/files/uk/1_simple.csv',
      'sources/files/uk/2_simple.csv',
    );
    expect(await Bun.file(join(ctx.workspace, 'sources/files/it/1_simple.csv')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/it/1_simple.csv')).text(),
    );
    expect(await Bun.file(join(ctx.workspace, 'sources/files/it/2_simple.csv')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/it/2_simple.csv')).text(),
    );
    expect(await Bun.file(join(ctx.workspace, 'sources/files/uk/1_simple.csv')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/uk/1_simple.csv')).text(),
    );
    expect(await Bun.file(join(ctx.workspace, 'sources/files/uk/2_simple.csv')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/uk/2_simple.csv')).text(),
    );
  });

  test('uploads sources to a brand-new branch', async () => {
    const result = await ctx.runner.run(['upload', 'sources', '-b', 'test-branch']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Directory sources created');
    expect(result.stdout).toContain('Directory files created');
    expect(result.stdout).toContain("File 'sources/files/1_simple.csv'");
    expect(result.stdout).toContain("File 'sources/files/2_simple.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('updates sources on the branch (branch already exists)', async () => {
    const result = await ctx.runner.run(['upload', 'sources', '-b', 'test-branch']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'sources/files/1_simple.csv'");
    expect(result.stdout).toContain("File 'sources/files/2_simple.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads translations to the branch', async () => {
    const result = await ctx.runner.run(['upload', 'translations', '-b', 'test-branch']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Importing translations for file 'sources/files/it/1_simple.csv'");
    expect(result.stdout).toContain("Importing translations for file 'sources/files/it/2_simple.csv'");
    expect(result.stdout).toContain("Importing translations for file 'sources/files/uk/1_simple.csv'");
    expect(result.stdout).toContain("Importing translations for file 'sources/files/uk/2_simple.csv'");
    expect(result.stdout).toContain("File 'sources/files/it/1_simple.csv'");
    expect(result.stdout).toContain("File 'sources/files/it/2_simple.csv'");
    expect(result.stdout).toContain("File 'sources/files/uk/1_simple.csv'");
    expect(result.stdout).toContain("File 'sources/files/uk/2_simple.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  // Fails on the same `ident9` row as the non-branch download tests above.
  test('downloads translations for a single language on the branch', async () => {
    const result = await ctx.runner.run(['download', 'translations', '-l', 'uk', '-b', 'test-branch']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();

    expect(await Bun.file(join(ctx.workspace, 'sources/files/uk/1_simple.csv')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/uk/1_simple.csv')).text(),
    );
    expect(await Bun.file(join(ctx.workspace, 'sources/files/uk/2_simple.csv')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/uk/2_simple.csv')).text(),
    );
  });

  // Fails on the same `ident9` row as the non-branch download tests above.
  test('downloads translations for every target language on the branch', async () => {
    const result = await ctx.runner.run(['download', 'translations', '-b', 'test-branch']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();

    expect(await Bun.file(join(ctx.workspace, 'sources/files/it/1_simple.csv')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/it/1_simple.csv')).text(),
    );
    expect(await Bun.file(join(ctx.workspace, 'sources/files/it/2_simple.csv')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/it/2_simple.csv')).text(),
    );
    expect(await Bun.file(join(ctx.workspace, 'sources/files/uk/1_simple.csv')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/uk/1_simple.csv')).text(),
    );
    expect(await Bun.file(join(ctx.workspace, 'sources/files/uk/2_simple.csv')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/uk/2_simple.csv')).text(),
    );
  });

  // Real, expected-red-by-design behavior (not a CLI bug): the API rejects a CSV `scheme` missing the
  // "Source String"/"Translation" elements at file-creation time. The branch and directory structure
  // still get created (that happens before the per-file create call), but every file fails with the
  // backend's validation error, and the command exits non-zero. `The file schema must include the
  // "Source String" and "Translation" elements` is confirmed as the real API validation message (same
  // backend the PHP test observed it against, via CrowdinValidationError in
  // node_modules/@crowdin/crowdin-api-client); the surrounding CLI wrapper text
  // (`Failed to create file <name>. <message>`, from FileService.createProjectFile / toCliError.ts) is
  // new TS-CLI wording with no PHP equivalent, so it's left to the snapshot instead of asserted literally.
  test('rejects a scheme missing the Source String/Translation elements, on a new branch', async () => {
    await switchConfig(ctx, 'invalid-scheme');

    const result = await ctx.runner.run(['upload', 'sources', '-b', 'test-branch-invalid-scheme']);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('Directory sources created');
    expect(result.stdout).toContain('Directory files created');
    expect(result.stdout).toContain('The file schema must include the "Source String" and "Translation" elements');
    expect(result.stdout).toContain('Current execution finished with errors');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });
});
