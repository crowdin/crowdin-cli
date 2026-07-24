import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { writeConfig } from '../helpers/config.ts';
import { expectFilesExist } from '../helpers/files.ts';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

describe('csv simple', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    ctx = await setupSuite('csv-simple', { targetLanguageIds: ['it', 'uk'] });
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

  // Known-broken as of 2026-07-21 (see crowdin-cli-known-bugs memory, Bug 4) — left red intentionally
  // as a regression marker, do not "fix" the assertions to match the current buggy behavior. Root
  // cause: UploadSourcesCommand's existing-file lookup keys off `file.data.path`, which Crowdin returns
  // branch-prefixed (`test-branch/sources/files/...`) for a branched file, but the locally computed
  // `projectPath` used as the lookup key is branch-agnostic (`sources/files/...`), so the lookup always
  // misses on the 2nd+ upload to an existing branch. The server then legitimately rejects the resulting
  // duplicate create with "Project already contains the file '<path>'", and the command exits non-zero.
  test('updates sources on the branch (branch already exists)', async () => {
    const result = await ctx.runner.run(['upload', 'sources', '-b', 'test-branch']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'sources/files/1_simple.csv'");
    expect(result.stdout).toContain("File 'sources/files/2_simple.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  // Cascading effect of the same Known Bug 4 as above: UploadTranslationsCommand.buildTranslationEntries
  // resolves the source file's project path the same branch-agnostic way, so it can't find the branched
  // source file either — every entry fails with "Source file '<path>' does not exist in the project" and
  // no translation ever reaches the server for this branch.
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

  // Cascading effect of Bug 4: no translations were ever actually imported to `test-branch` above, so
  // this can't reproduce the expected translated content either.
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

  // Cascading effect of Bug 4, same as above.
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
    const template = await Bun.file(join(ctx.workspace, 'alt-configs', 'invalid-scheme.yml')).text();
    await writeConfig(ctx.workspace, template, { projectId: ctx.project.id, token: ctx.env.token as string });

    const result = await ctx.runner.run(['upload', 'sources', '-b', 'test-branch-invalid-scheme']);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('Directory sources created');
    expect(result.stdout).toContain('Directory files created');
    expect(result.stdout).toContain('The file schema must include the "Source String" and "Translation" elements');
    expect(result.stdout).toContain('Current execution finished with errors');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });
});
