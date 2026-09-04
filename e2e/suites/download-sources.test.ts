import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { capturedContent, expectFilesExist } from '../helpers/files.ts';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, switchConfig, teardownSuite } from '../helpers/suite.ts';

// Local paths the nested source patterns resolve to (see fixtures/download-sources/config/crowdin.yml).
// `download sources` reconstructs these exact local paths from the `source` pattern regardless of the
// group's `dest` (folder_1's files are stored server-side under `root/...` but download back here).
const SOURCE_RELATIVE_PATHS = [
  'folder_1/android.xml',
  'folder_1/f1/android.xml',
  'folder_1/f1/f2/android.xml',
  'folder_2/android_1.xml',
  'folder_2/android_2.xml',
  'folder_2/android_3.xml',
  'folder_2/android_4a.xml',
];

async function removeDownloadedSources(ctx: SuiteContext): Promise<void> {
  await rm(join(ctx.workspace, 'folder_1'), { recursive: true, force: true });
  await rm(join(ctx.workspace, 'folder_2'), { recursive: true, force: true });
}

describe('download sources', () => {
  let ctx: SuiteContext;
  // Captured so a later test can switch back after the no-sources config is swapped in.
  let originalConfig: string;
  // Captured before the first download deletes the local copies; the branch upload used the same
  // fixture files, so every later test compares against these bytes.
  const sourceContent = new Map<string, string>();

  beforeAll(async () => {
    ctx = await setupSuite('download-sources', { targetLanguageIds: ['it', 'uk'] });
    originalConfig = await Bun.file(join(ctx.workspace, 'crowdin.yml')).text();
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('uploads all nested source files to the project', async () => {
    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);

    // Captured before the assertions below, so a failure here does not cascade as 'No content was
    // captured' through the rest of the suite.
    for (const relativePath of SOURCE_RELATIVE_PATHS) {
      sourceContent.set(relativePath, await Bun.file(join(ctx.workspace, relativePath)).text());
    }

    // Success lines print the project path, so folder_1's `dest` prefix shows up and folder_2's
    // group has none.
    expect(result.stdout).toContain("Directory 'folder_2'");
    expect(result.stdout).toContain("Directory 'root'");
    expect(result.stdout).toContain("Directory 'root/folder_1'");
    expect(result.stdout).toContain("Directory 'root/folder_1/f1'");
    expect(result.stdout).toContain("Directory 'root/folder_1/f1/f2'");
    // File success lines report the `dest`-mapped project path, not the local one.
    expect(result.stdout).toContain("File 'folder_2/android_1.xml'");
    expect(result.stdout).toContain("File 'folder_2/android_2.xml'");
    expect(result.stdout).toContain("File 'folder_2/android_3.xml'");
    expect(result.stdout).toContain("File 'folder_2/android_4a.xml'");
    expect(result.stdout).toContain("File 'root/folder_1/android.xml'");
    expect(result.stdout).toContain("File 'root/folder_1/f1/android.xml'");
    expect(result.stdout).toContain("File 'root/folder_1/f1/f2/android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads the same nested source files to a brand-new branch', async () => {
    const result = await ctx.runner.run(['upload', 'sources', '-b', 'b1']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'folder_2/android_1.xml'");
    expect(result.stdout).toContain("File 'root/folder_1/f1/f2/android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads sources back to their original local paths', async () => {
    await removeDownloadedSources(ctx);

    const result = await ctx.runner.run(['download', 'sources']);

    expect(result.exitCode).toBe(0);
    // Download success lines report the server-side project path (DownloadCommand.ts ~line 239:
    // `File '${download.relativePath}'`), which is `dest`-mapped for the folder_1 group.
    // folder_1's `dest` uses `%original_path%`, the source file's parent directory - so no doubled
    // filename segment in the result.
    expect(result.stdout).toContain("File 'root/folder_1/android.xml'");
    expect(result.stdout).toContain("File 'root/folder_1/f1/android.xml'");
    expect(result.stdout).toContain("File 'root/folder_1/f1/f2/android.xml'");
    expect(result.stdout).toContain("File 'folder_2/android_1.xml'");
    // A `[...]` class in the source pattern matches server-side during download exactly as it does
    // locally during upload.
    expect(result.stdout).toContain("File 'folder_2/android_2.xml'");
    expect(result.stdout).toContain("File 'folder_2/android_3.xml'");
    expect(result.stdout).toContain("File 'folder_2/android_4a.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesExist(ctx.workspace, ...SOURCE_RELATIVE_PATHS);

    for (const relativePath of SOURCE_RELATIVE_PATHS) {
      expect(await Bun.file(join(ctx.workspace, relativePath)).text()).toBe(
        capturedContent(sourceContent, relativePath),
      );
    }
  });

  test('downloads sources again with --output plain', async () => {
    await removeDownloadedSources(ctx);

    // `--output plain` stands in for Java's `--plain`: bare downloaded paths instead of messages.
    const result = await ctx.runner.run(['download', 'sources', '--output', 'plain']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();

    // `--output plain` changes the messages, never which files are written.
    await expectFilesExist(ctx.workspace, ...SOURCE_RELATIVE_PATHS);

    for (const relativePath of SOURCE_RELATIVE_PATHS) {
      expect(await Bun.file(join(ctx.workspace, relativePath)).text()).toBe(
        capturedContent(sourceContent, relativePath),
      );
    }
  });

  test('downloads sources from the b1 branch', async () => {
    await removeDownloadedSources(ctx);

    // Server paths carry the branch name; the download strips it before matching, so a branch
    // resolves the same 7 files as master.
    const result = await ctx.runner.run(['download', 'sources', '-b', 'b1']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesExist(ctx.workspace, ...SOURCE_RELATIVE_PATHS);

    for (const relativePath of SOURCE_RELATIVE_PATHS) {
      expect(await Bun.file(join(ctx.workspace, relativePath)).text()).toBe(
        capturedContent(sourceContent, relativePath),
      );
    }
  });

  test('warns when a source pattern matches nothing', async () => {
    await switchConfig(ctx, 'no-sources');

    const result = await ctx.runner.run(['download', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain(
      "No sources found for '/folder_not_exists/**/*.xml' pattern. Check the source paths in your configuration file",
    );
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('rejects --reviewed on a non-Enterprise (SaaS) account', async () => {
    // Restores the bytes captured in `beforeAll`, already rendered.
    await Bun.write(join(ctx.workspace, 'crowdin.yml'), originalConfig);

    const result = await ctx.runner.run(['download', 'sources', '--reviewed']);

    expect(result.exitCode).toBe(0);
    // This account is SaaS, so this hits the PHP test's non-Enterprise arm.
    expect(result.stderr).toContain('Operation is available only for Crowdin Enterprise');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });
});
