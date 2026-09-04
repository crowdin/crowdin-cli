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
  // Captured once, right after setup, so test 'rejects --reviewed...' can switch back to it after the
  // 'warns when a source pattern matches nothing' test swaps in alt-configs/no-sources.yml.
  let originalConfig: string;
  // Captured from the fixture files before the first `download sources` test deletes the local copies.
  // Reused by every later re-download/branch-download test since both the master upload and the `b1`
  // branch upload came from the exact same fixture files (all byte-identical content anyway).
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

    // Captured before the output assertions below: these bytes are the baseline every later
    // re-download test compares against, and an assertion failing here must not leave the map empty
    // and cascade into 'No content was captured' across the whole suite.
    for (const relativePath of SOURCE_RELATIVE_PATHS) {
      sourceContent.set(relativePath, await Bun.file(join(ctx.workspace, relativePath)).text());
    }

    // Directory and file success lines print the cumulative PROJECT path, so folder_1's group -
    // which has a `dest` under `root/` - shows up prefixed, while folder_2's group does not.
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
    // First upload to a brand-new branch always takes the create path (the existing-file map starts
    // empty), so nothing here depends on how server paths are keyed; this suite never does a second
    // upload to an already-existing branch.
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
    //
    // folder_1's `dest` uses `%original_path%`, which resolves to the source file's parent directory
    // (`translationPathResolver.ts` / `fileOptions.ts` both return `parsed.dir`) - so
    // `folder_1/f1/android.xml` lands on `root/folder_1/f1/android.xml`, with no doubled filename
    // segment.
    expect(result.stdout).toContain("File 'root/folder_1/android.xml'");
    expect(result.stdout).toContain("File 'root/folder_1/f1/android.xml'");
    expect(result.stdout).toContain("File 'root/folder_1/f1/f2/android.xml'");
    expect(result.stdout).toContain("File 'folder_2/android_1.xml'");
    // `globToRegex` (lib/config/projectFileMatch.ts) translates `[...]` into a real regex character
    // class, so the `/folder_2/android_[2-3].xml` source pattern matches server-side during download
    // exactly as Bun's Glob matches it locally during upload. The same matcher backs
    // `download translations` (lib/download/translationMapping.ts).
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

    // `--output plain` stands in for the PHP/Java `--plain` flag: the per-file `output.success`
    // lines are gated on `format === 'text'`, and the machine formats get the closing summary
    // instead (DownloadCommand.ts), so plain lists the bare downloaded paths like the original.
    const result = await ctx.runner.run(['download', 'sources', '--output', 'plain']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();

    // Same set of files as the previous test: `--output plain` only silences the messages, it does
    // not change which files are matched or written.
    await expectFilesExist(ctx.workspace, ...SOURCE_RELATIVE_PATHS);

    for (const relativePath of SOURCE_RELATIVE_PATHS) {
      expect(await Bun.file(join(ctx.workspace, relativePath)).text()).toBe(
        capturedContent(sourceContent, relativePath),
      );
    }
  });

  test('downloads sources from the b1 branch', async () => {
    await removeDownloadedSources(ctx);

    // `fileService.loadProjectFiles(branchId)` returns branch-scoped file paths *prefixed* with the
    // branch name (e.g. `b1/folder_2/android_1.xml`), while `collectSourceDownloads` matches against
    // the branch-agnostic `source`/`dest` patterns from crowdin.yml with an exact, non-prefixed regex
    // under `preserve_hierarchy: true`. `DownloadCommand.stripBranchFromPaths` removes the prefix
    // before the match (DownloadCommand.ts ~line 163), so every pattern group resolves on a branch
    // exactly as it does on master - this asserts the same 7 files as the master download tests.
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
    // Confirmed verbatim at DownloadCommand.ts ~line 743-745.
    expect(result.stderr).toContain(
      "No sources found for '/folder_not_exists/**/*.xml' pattern. Check the source paths in your configuration file",
    );
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('rejects --reviewed on a non-Enterprise (SaaS) account', async () => {
    // Restores the bytes captured in `beforeAll` - already rendered, so it goes straight to disk
    // rather than back through `switchConfig`/`renderConfig`.
    await Bun.write(join(ctx.workspace, 'crowdin.yml'), originalConfig);

    const result = await ctx.runner.run(['download', 'sources', '--reviewed']);

    expect(result.exitCode).toBe(0);
    // Confirmed verbatim at DownloadCommand.ts:140 -- this e2e account is SaaS, not Enterprise, so this
    // hits the same branch the PHP test's `else` (non-ENTERPRISE_MODE) arm expects.
    expect(result.stderr).toContain('Operation is available only for Crowdin Enterprise');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });
});
