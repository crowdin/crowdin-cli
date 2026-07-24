import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { writeConfig } from '../helpers/config.ts';
import { expectFilesExist } from '../helpers/files.ts';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/** Equivalent of the PHP suite's `ProjectFilesHelper::deleteAllFiles()`. */
async function deleteAllProjectFiles(ctx: SuiteContext): Promise<void> {
  const files = await ctx.client.sourceFilesApi.listProjectFiles(ctx.project.id);
  for (const file of files.data) {
    await ctx.client.sourceFilesApi.deleteFile(ctx.project.id, file.data.id);
  }
}

describe('base path', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    ctx = await setupSuite('base-path', { targetLanguageIds: ['it', 'uk'] });
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('uploads sources with an explicit --base-path, creating the directory hierarchy', async () => {
    const result = await ctx.runner.run(['upload', 'sources', '--base-path', '.']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Directory files created');
    expect(result.stdout).toContain('Directory src created');
    expect(result.stdout).toContain('Directory main created');
    expect(result.stdout).toContain('Directory res created');
    expect(result.stdout).toContain('Directory values created');
    expect(result.stdout).toContain("File 'files/src/main/res/values/android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('updates the existing source file at the same base path', async () => {
    const result = await ctx.runner.run(['upload', 'sources', '--base-path', '.']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'files/src/main/res/values/android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads translations at the base path', async () => {
    const result = await ctx.runner.run(['upload', 'translations', '--base-path', '.']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Importing translations for file 'files/src/main/res/values-it/android.xml'");
    expect(result.stdout).toContain("Importing translations for file 'files/src/main/res/values-uk/android.xml'");
    expect(result.stdout).toContain("File 'files/src/main/res/values-it/android.xml'");
    expect(result.stdout).toContain("File 'files/src/main/res/values-uk/android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations at the base path', async () => {
    const result = await ctx.runner.run(['download', 'translations', '--base-path', '.']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesExist(
      ctx.workspace,
      'files/src/main/res/values-it/android.xml',
      'files/src/main/res/values-uk/android.xml',
    );
  });

  test('lists project source files with --base-path', async () => {
    const result = await ctx.runner.run(['file', 'list', '--base-path', '.']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('files/src/main/res/values/android.xml');
  });

  test('lists configured source files with --base-path', async () => {
    const result = await ctx.runner.run(['config', 'sources', '--base-path', '.']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('lists configured translation files with --base-path', async () => {
    const result = await ctx.runner.run(['config', 'translations', '--base-path', '.']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads sources to a new branch under a different base path', async () => {
    const result = await ctx.runner.run(['upload', 'sources', '-b', 'dev', '--base-path', 'dev']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Directory files created');
    expect(result.stdout).toContain('Directory src created');
    expect(result.stdout).toContain('Directory main created');
    expect(result.stdout).toContain('Directory res created');
    expect(result.stdout).toContain('Directory values created');
    expect(result.stdout).toContain("File 'files/src/main/res/values/android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('updates sources on the branch (branch already exists)', async () => {
    const result = await ctx.runner.run(['upload', 'sources', '-b', 'dev', '--base-path', 'dev']);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'files/src/main/res/values/android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads translations on the branch', async () => {
    const result = await ctx.runner.run(['upload', 'translations', '-b', 'dev', '--base-path', 'dev']);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'files/src/main/res/values-it/android.xml'");
    expect(result.stdout).toContain("File 'files/src/main/res/values-uk/android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations on the branch', async () => {
    const result = await ctx.runner.run(['download', 'translations', '-b', 'dev', '--base-path', 'dev']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesExist(
      ctx.workspace,
      'dev/files/src/main/res/values-it/android.xml',
      'dev/files/src/main/res/values-uk/android.xml',
    );
  });

  test('uploads sources with a relative --base-path pointing into a subdirectory', async () => {
    const template = await Bun.file(join(ctx.workspace, 'alt-configs', 'relative-base-path.yml')).text();
    await writeConfig(ctx.workspace, template, { projectId: ctx.project.id, token: ctx.env.token as string });
    await deleteAllProjectFiles(ctx);

    const result = await ctx.runner.run(['upload', 'sources', '--base-path', './files']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'src/main/res/values/android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads translations with a relative --base-path', async () => {
    const result = await ctx.runner.run(['upload', 'translations', '--base-path', './files']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'src/main/res/values-it/android.xml'");
    expect(result.stdout).toContain("File 'src/main/res/values-uk/android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations with a relative --base-path', async () => {
    const result = await ctx.runner.run(['download', 'translations', '--base-path', './files']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesExist(
      ctx.workspace,
      'files/src/main/res/values-it/android.xml',
      'files/src/main/res/values-uk/android.xml',
    );
  });
});
