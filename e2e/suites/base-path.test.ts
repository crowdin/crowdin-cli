import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { expectFilesExist } from '../helpers/files.ts';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, switchConfig, teardownSuite } from '../helpers/suite.ts';

async function deleteAllProjectFiles(ctx: SuiteContext): Promise<void> {
  const files = await ctx.client.sourceFilesApi.withFetchAll().listProjectFiles(ctx.project.id);
  for (const file of files.data) {
    await ctx.client.sourceFilesApi.deleteFile(ctx.project.id, file.data.id);
  }
}

/**
 * Every `translation` pattern in this suite's configs resolves to a path the upload fixtures already
 * occupy, so a download that silently writes nothing would still leave those files on disk and pass
 * an existence check. Record the content and delete the files first; the download has to put them
 * back. Mirrors `clearDownloadedTranslations` in the other download suites.
 */
async function captureAndClear(ctx: SuiteContext, ...relativePaths: string[]): Promise<Map<string, string>> {
  const captured = new Map<string, string>();

  for (const relativePath of relativePaths) {
    captured.set(relativePath, await Bun.file(join(ctx.workspace, relativePath)).text());
    await rm(join(ctx.workspace, relativePath), { force: true });
  }

  return captured;
}

/** Assert a download recreated every captured path with the content it had before being cleared. */
async function expectRestored(ctx: SuiteContext, captured: Map<string, string>): Promise<void> {
  await expectFilesExist(ctx.workspace, ...captured.keys());

  for (const [relativePath, content] of captured) {
    expect(await Bun.file(join(ctx.workspace, relativePath)).text()).toBe(content);
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
    const captured = await captureAndClear(
      ctx,
      'files/src/main/res/values-it/android.xml',
      'files/src/main/res/values-uk/android.xml',
    );

    const result = await ctx.runner.run(['download', 'translations', '--base-path', '.']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectRestored(ctx, captured);
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

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'files/src/main/res/values/android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads translations on the branch', async () => {
    const result = await ctx.runner.run(['upload', 'translations', '-b', 'dev', '--base-path', 'dev']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'files/src/main/res/values-it/android.xml'");
    expect(result.stdout).toContain("File 'files/src/main/res/values-uk/android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations on the branch', async () => {
    const captured = await captureAndClear(
      ctx,
      'dev/files/src/main/res/values-it/android.xml',
      'dev/files/src/main/res/values-uk/android.xml',
    );

    const result = await ctx.runner.run(['download', 'translations', '-b', 'dev', '--base-path', 'dev']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectRestored(ctx, captured);
  });

  test('uploads sources with a relative --base-path pointing into a subdirectory', async () => {
    await switchConfig(ctx, 'relative-base-path');
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
    const captured = await captureAndClear(
      ctx,
      'files/src/main/res/values-it/android.xml',
      'files/src/main/res/values-uk/android.xml',
    );

    const result = await ctx.runner.run(['download', 'translations', '--base-path', './files']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectRestored(ctx, captured);
  });
});
