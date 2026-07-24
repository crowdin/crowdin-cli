import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { copyFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { writeConfig } from '../helpers/config.ts';
import { expectFilesExist } from '../helpers/files.ts';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/** Overwrites the workspace's `crowdin.yml` with one of the `alt-configs/<name>.yml` templates. */
async function switchConfig(ctx: SuiteContext, name: string): Promise<void> {
  const template = await Bun.file(join(ctx.workspace, 'alt-configs', `${name}.yml`)).text();
  await writeConfig(ctx.workspace, template, { projectId: ctx.project.id, token: ctx.env.token as string });
}

describe('branches', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    ctx = await setupSuite('branches', { targetLanguageIds: ['it', 'uk'] });
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('uploads a single source file to a brand-new branch', async () => {
    const result = await ctx.runner.run(['upload', 'sources', '-b', 'test_list_string']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'sources_one_file/1_android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('previews uploading two more source files to a not-yet-existing branch (dry run)', async () => {
    await switchConfig(ctx, 'sources');

    const result = await ctx.runner.run(['upload', 'sources', '--dryrun', '-b', 'test-branch']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('previews the source upload dry run as a tree', async () => {
    const result = await ctx.runner.run(['upload', 'sources', '--dryrun', '--tree', '-b', 'test-branch']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads the two source files for real, creating the branch', async () => {
    const result = await ctx.runner.run(['upload', 'sources', '-b', 'test-branch']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'sources/1_android.xml'");
    expect(result.stdout).toContain("File 'sources/2_android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('updates the existing sources after local changes', async () => {
    await copyFile(
      join(ctx.workspace, 'sources_rev2', '1_android.xml'),
      join(ctx.workspace, 'sources', '1_android.xml'),
    );
    await copyFile(
      join(ctx.workspace, 'sources_rev2', '2_android.xml'),
      join(ctx.workspace, 'sources', '2_android.xml'),
    );

    const result = await ctx.runner.run(['upload', 'sources', '-b', 'test-branch']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'sources/1_android.xml'");
    expect(result.stdout).toContain("File 'sources/2_android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('previews the translation upload as a dry run', async () => {
    const result = await ctx.runner.run(['upload', 'translations', '--dryrun', '-b', 'test-branch']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('previews the translation dry run as a tree', async () => {
    const result = await ctx.runner.run(['upload', 'translations', '--dryrun', '--tree', '-b', 'test-branch']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads translations for the updated sources', async () => {
    await switchConfig(ctx, 'sources-rev2');

    const result = await ctx.runner.run(['upload', 'translations', '-b', 'test-branch']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Importing translations for file 'translations/it/1_android.xml'");
    expect(result.stdout).toContain("Importing translations for file 'translations/it/2_android.xml'");
    expect(result.stdout).toContain("Importing translations for file 'translations/uk/1_android.xml'");
    expect(result.stdout).toContain("Importing translations for file 'translations/uk/2_android.xml'");
    expect(result.stdout).toContain("File 'translations/it/1_android.xml'");
    expect(result.stdout).toContain("File 'translations/it/2_android.xml'");
    expect(result.stdout).toContain("File 'translations/uk/1_android.xml'");
    expect(result.stdout).toContain("File 'translations/uk/2_android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations for the branch', async () => {
    await rm(join(ctx.workspace, 'translations'), { recursive: true, force: true });

    const result = await ctx.runner.run(['download', 'translations', '-b', 'test-branch']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesExist(
      ctx.workspace,
      'translations/it/1_android.xml',
      'translations/it/2_android.xml',
      'translations/uk/1_android.xml',
      'translations/uk/2_android.xml',
    );

    expect(await Bun.file(join(ctx.workspace, 'translations/it/1_android.xml')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/it/1_android.xml')).text(),
    );
    expect(await Bun.file(join(ctx.workspace, 'translations/it/2_android.xml')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/it/2_android.xml')).text(),
    );
    expect(await Bun.file(join(ctx.workspace, 'translations/uk/1_android.xml')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/uk/1_android.xml')).text(),
    );
    expect(await Bun.file(join(ctx.workspace, 'translations/uk/2_android.xml')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/uk/2_android.xml')).text(),
    );
  });
});
