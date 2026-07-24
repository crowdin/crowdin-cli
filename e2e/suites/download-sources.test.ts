import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { writeConfig } from '../helpers/config.ts';
import { expectFilesExist } from '../helpers/files.ts';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

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

/** Overwrites the workspace's `crowdin.yml` with a rendered template string. */
async function switchConfig(ctx: SuiteContext, template: string): Promise<void> {
  await writeConfig(ctx.workspace, template, { projectId: ctx.project.id, token: ctx.env.token as string });
}

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
    // Directory success lines print the bare last path segment, not the cumulative project path
    // (UploadSourcesCommand.ts ~line 480: `Directory ${directoryName} created`).
    expect(result.stdout).toContain('Directory folder_2 created');
    expect(result.stdout).toContain('Directory root created');
    expect(result.stdout).toContain('Directory folder_1 created');
    expect(result.stdout).toContain('Directory f1 created');
    expect(result.stdout).toContain('Directory f2 created');
    // File success lines report the local file path, not the server-side `dest`-mapped project path
    // (UploadSourcesCommand.ts ~line 389: `File '${localFilePath}'`).
    expect(result.stdout).toContain("File 'folder_2/android_1.xml'");
    expect(result.stdout).toContain("File 'folder_2/android_2.xml'");
    expect(result.stdout).toContain("File 'folder_2/android_3.xml'");
    expect(result.stdout).toContain("File 'folder_2/android_4a.xml'");
    expect(result.stdout).toContain("File 'folder_1/android.xml'");
    expect(result.stdout).toContain("File 'folder_1/f1/android.xml'");
    expect(result.stdout).toContain("File 'folder_1/f1/f2/android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();

    for (const relativePath of SOURCE_RELATIVE_PATHS) {
      sourceContent.set(relativePath, await Bun.file(join(ctx.workspace, relativePath)).text());
    }
  });

  test('uploads the same nested source files to a brand-new branch', async () => {
    // First upload to a brand-new branch always takes the create path (the existing-file map starts
    // empty), so this does not hit the branch-reupload lookup bug (see crowdin-cli-known-bugs Bug 4) --
    // that only manifests from a *second* upload to an already-existing branch, which this suite never does.
    const result = await ctx.runner.run(['upload', 'sources', '-b', 'b1']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'folder_2/android_1.xml'");
    expect(result.stdout).toContain("File 'folder_1/f1/f2/android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads sources back to their original local paths', async () => {
    await removeDownloadedSources(ctx);

    const result = await ctx.runner.run(['download', 'sources']);

    expect(result.exitCode).toBe(0);
    // Download success lines report the server-side project path (DownloadCommand.ts ~line 239:
    // `File '${download.relativePath}'`), which is `dest`-mapped for the folder_1 group.
    //
    // CONFIRMED BUGS live-surfaced by this exact assertion (2026-07-21, see crowdin-cli-known-bugs
    // memory) — left red as regression markers, do not weaken to match the buggy output:
    //
    // Bug 7 (2nd live confirmation, previously only code-traced): folder_1's `dest` uses
    // `%original_path%`, which TS resolves to the FULL relative path incl. filename instead of just
    // the directory. Real server path ends up `root/folder_1/android.xml/android.xml` (filename
    // doubled as a fake directory segment), not `root/folder_1/android.xml`.
    expect(result.stdout).toContain("File 'root/folder_1/android.xml'");
    expect(result.stdout).toContain("File 'root/folder_1/f1/android.xml'");
    expect(result.stdout).toContain("File 'root/folder_1/f1/f2/android.xml'");
    expect(result.stdout).toContain("File 'folder_2/android_1.xml'");
    // Bug 9 (new, confirmed here): `globToRegex` (lib/config/projectFileMatch.ts:11-46) has no
    // bracket-class glob support — it blindly escapes `[`/`]` as literal regex characters instead of
    // implementing a character class. So the `/folder_2/android_[2-3].xml` source pattern can never
    // match a real project file during download (local upload-side matching uses a real glob library
    // and works fine, which is why the earlier `upload sources` test passes). Real output prints
    // `No sources found for '/folder_2/android_[2-3].xml' pattern...` instead of these two files.
    // Same broken matcher is also used by `download translations` (lib/download/translationMapping.ts).
    expect(result.stdout).toContain("File 'folder_2/android_2.xml'");
    expect(result.stdout).toContain("File 'folder_2/android_3.xml'");
    expect(result.stdout).toContain("File 'folder_2/android_4a.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesExist(ctx.workspace, ...SOURCE_RELATIVE_PATHS);

    for (const relativePath of SOURCE_RELATIVE_PATHS) {
      expect(await Bun.file(join(ctx.workspace, relativePath)).text()).toBe(sourceContent.get(relativePath));
    }
  });

  test('downloads sources again with --output plain', async () => {
    await removeDownloadedSources(ctx);

    // NOTE: unlike the PHP/Java CLI's `--plain` (which lists bare downloaded paths), the TS rewrite's
    // real (non-dryrun) `download sources` path never checks `options.output` at all -- only the
    // `--dryrun` branch does (DownloadCommand.ts ~line 166: `options.output === 'plain'` is inside
    // `if (options.dryrun)`). Every `output.success/info/warning` call is additionally gated on
    // `format === 'text'` (output.ts), so with `--output plain` those calls become silent no-ops and
    // this real download is expected to print nothing at all, even though it still downloads correctly.
    const result = await ctx.runner.run(['download', 'sources', '--output', 'plain']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();

    // Same Bug 7 (folder_1 `%original_path%` doubling) + Bug 9 (folder_2 bracket-class pattern never
    // matches) as the previous test — left red for the same reason, see comments there.
    await expectFilesExist(ctx.workspace, ...SOURCE_RELATIVE_PATHS);

    for (const relativePath of SOURCE_RELATIVE_PATHS) {
      expect(await Bun.file(join(ctx.workspace, relativePath)).text()).toBe(sourceContent.get(relativePath));
    }
  });

  test('downloads sources from the b1 branch', async () => {
    await removeDownloadedSources(ctx);

    // `fileService.loadProjectFiles(branchId)` has been observed (crowdin-cli-known-bugs Bug 4) to
    // return branch-scoped file paths *prefixed* with the branch name (e.g. `b1/folder_2/android_1.xml`).
    // `collectSourceDownloads` matches those paths against the branch-agnostic `source`/`dest` patterns
    // from crowdin.yml with an exact, non-prefixed regex under `preserve_hierarchy: true` -- if the
    // prefix is really present here too, every pattern group fails to match, a new sibling of Bug 4 on
    // the download side.
    //
    // STRONGLY SUPPORTED (2026-07-21): live run showed ALL 7 expected files missing here -- including
    // folder_2/android_1.xml and folder_2/android_4a.xml, the two groups that download correctly on the
    // master branch in the previous two tests (unaffected by Bug 7/Bug 9 above). Since those two groups
    // work on master, something branch-specific -- not Bug 7/9 -- is additionally breaking them here,
    // consistent with a total pattern-match failure caused by the branch-name prefix. Exact stdout not
    // yet captured to pin the precise wording (e.g. confirm "No sources found" fires for every group);
    // do that on the next live run before writing this up as a fully independent, numbered bug.
    const result = await ctx.runner.run(['download', 'sources', '-b', 'b1']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesExist(ctx.workspace, ...SOURCE_RELATIVE_PATHS);

    for (const relativePath of SOURCE_RELATIVE_PATHS) {
      expect(await Bun.file(join(ctx.workspace, relativePath)).text()).toBe(sourceContent.get(relativePath));
    }
  });

  test('warns when a source pattern matches nothing', async () => {
    const template = await Bun.file(join(ctx.workspace, 'alt-configs', 'no-sources.yml')).text();
    await switchConfig(ctx, template);

    const result = await ctx.runner.run(['download', 'sources']);

    expect(result.exitCode).toBe(0);
    // Confirmed verbatim at DownloadCommand.ts ~line 743-745.
    expect(result.stdout).toContain(
      "No sources found for '/folder_not_exists/**/*.xml' pattern. Check the source paths in your configuration file",
    );
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('rejects --reviewed on a non-Enterprise (SaaS) account', async () => {
    await switchConfig(ctx, originalConfig);

    const result = await ctx.runner.run(['download', 'sources', '--reviewed']);

    expect(result.exitCode).toBe(0);
    // Confirmed verbatim at DownloadCommand.ts:140 -- this e2e account is SaaS, not Enterprise, so this
    // hits the same branch the PHP test's `else` (non-ENTERPRISE_MODE) arm expects.
    expect(result.stdout).toContain('Operation is available only for Crowdin Enterprise');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });
});
