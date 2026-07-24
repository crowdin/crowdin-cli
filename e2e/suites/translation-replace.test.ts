import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { expectFilesExist } from '../helpers/files.ts';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * Ported from `crowdin-backend/tests/Cli/Common/CliTranslationReplaceTest.php` (13 `@depends`-chained
 * methods, all ported 1:1 below). Exercises `upload sources` / `upload translations` / `download
 * translations` against a small nested Android-resources source tree, both on the default branch and
 * on a brand-new branch ('test-branch') - the real subject is what happens on a second `upload
 * sources` call to a file that already exists (update, not create) and how translations behave
 * around that, plus the same cycle repeated on a branch.
 *
 * Three deliberate deviations from a literal 1:1 port:
 *
 * 1. The fixture's `translation:` pattern and the dropped `translation_replace` config key - see the
 *    comment in `../fixtures/translation-replace/config/crowdin.yml` for the full reasoning
 *    (crowdin-cli-known-bugs.md Bug 7: `%original_path%` resolves to the full path INCLUDING the
 *    filename, not just the containing directory - confirmed offline this session via a throwaway
 *    script calling `TranslationPathResolver.resolve` directly, same method prior sessions used for
 *    `file-tree.test.ts`'s analogous deviation).
 *
 * 2. `testUploadTranslationsBranch` in the PHP original calls `self::$cli->uploadTranslations()` with
 *    NO `-b test-branch` (unlike every other "Branch" method in the same file, which all pass it).
 *    Read literally, twice, to make sure it wasn't a transcription slip on this port's part - it
 *    really is the bare call in the original. Ported literally below (`'re-uploads translations to
 *    the already-translated master files ...'`): since the branch's OWN source files (uploaded in
 *    the previous test) never receive any translation this way, the two subsequent
 *    "...OnTheBranch"/"Branch" download tests are building a translation archive for files that have
 *    no translations at all - Crowdin's build endpoint still includes such files (falling back to
 *    source content) unless `skip_untranslated_files` is set, which this config never sets, so the
 *    download tests should still succeed structurally. This suite therefore only asserts file
 *    existence and stdout for the branch download step, NOT downloaded-content equality (unlike the
 *    master download test below, which does assert content) - flagged here for a human to double
 *    check on the first live run whether that reasoning holds or whether this was actually a bug in
 *    the original PHP test that happened to go unnoticed because its own assertions are equally weak
 *    at that point.
 *
 * 3. Per-language translation content was made genuinely distinct between it/uk (and different from
 *    the English source) so downloaded content can actually be verified; the real PHP fixture
 *    (`tests/var/Cli/Common/CliTranslationReplaceTest/`) uses byte-identical placeholder text
 *    ("first string"/"second string") for every language, which would make a content-equality
 *    assertion meaningless.
 *
 * Bug 4 status (branch re-upload) - reconciled by reading current source this session, since prior
 * porting sessions recorded contradictory findings: `crowdin-cli-known-bugs.md` "Bug 4" (re-uploading
 * sources/translations to an already-existing branch always failed, because the existing-file lookup
 * ignored the branch-name prefix Crowdin includes in `file.data.path`) was fixed 2026-07-21 (commit
 * `aee7318c`), one day before this port. Confirmed directly by reading `UploadSourcesCommand.ts`
 * (~line 153: `projectFilePaths` is built via `stripBranchPrefix(file.data.path, branchName)` before
 * the lookup at ~line 303) and `UploadTranslationsCommand.ts` (~line 103: same `stripBranchPrefix`
 * call). This matches `file-tree.test.ts`'s 2026-07-22 finding, not the older, now-stale "still open"
 * note - the non-branch and branch "update sources" tests below are BOTH expected to PASS (no
 * "created" lines, successful update), not just the non-branch one.
 *
 * `upload sources -b <branch>` prints no branch-creation/already-exists message at all (confirmed by
 * reading `UploadSourcesCommand.ts`/`BranchService.getOrCreateBranch` - fully silent, matching this
 * effort's established finding from `file-tree.test.ts`), and directory/file success messages use the
 * LOCAL path with no branch-name prefix - so branch-upload output text is identical to the
 * non-branch upload's, confirmed by the same source read.
 */

const MASTER_SOURCE_FILE_PATHS = [
  '/en/src/main/resources/android.xml',
  '/en/src/main/resources/org/crowdin/android.xml',
  '/en/src/main/resources/org/crowdin/strings.xml',
].sort();

const BRANCH_SOURCE_FILE_PATHS = MASTER_SOURCE_FILE_PATHS.map((path) => `/test-branch${path}`).sort();

/** Equivalent of the PHP suite's `ProjectFilesHelper::getFilePaths(true)`. */
async function projectFilePaths(ctx: SuiteContext): Promise<string[]> {
  const files = await ctx.client.sourceFilesApi.listProjectFiles(ctx.project.id, { recursion: '1' });
  return files.data.map((file) => file.data.path).sort();
}

/** Equivalent of the PHP suite's `Common::files($this->tmp('files'))`: a full recursive file listing. */
async function listFilesRecursively(root: string): Promise<string[]> {
  const results: string[] = [];

  async function walk(dir: string, prefix: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        await walk(join(dir, entry.name), relativePath);
      } else if (entry.isFile()) {
        results.push(relativePath);
      }
    }
  }

  await walk(root, '');
  return results.sort();
}

const EXPECTED_LOCAL_FILES_AFTER_DOWNLOAD = [
  'en/src/main/resources/android.xml',
  'en/src/main/resources/org/crowdin/android.xml',
  'en/src/main/resources/org/crowdin/strings.xml',
  'it/src/main/resources/android.xml',
  'it/src/main/resources/org/crowdin/android.xml',
  'it/src/main/resources/org/crowdin/strings.xml',
  'uk/src/main/resources/android.xml',
  'uk/src/main/resources/org/crowdin/android.xml',
  'uk/src/main/resources/org/crowdin/strings.xml',
].sort();

describe('translation replace', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    ctx = await setupSuite('translation-replace', { targetLanguageIds: ['it', 'uk'] });
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('uploads sources, creating the nested directory hierarchy', async () => {
    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Directory en created');
    expect(result.stdout).toContain('Directory src created');
    expect(result.stdout).toContain('Directory main created');
    expect(result.stdout).toContain('Directory resources created');
    expect(result.stdout).toContain('Directory org created');
    expect(result.stdout).toContain('Directory crowdin created');
    expect(result.stdout).toContain("File 'en/src/main/resources/android.xml'");
    expect(result.stdout).toContain("File 'en/src/main/resources/org/crowdin/android.xml'");
    expect(result.stdout).toContain("File 'en/src/main/resources/org/crowdin/strings.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();

    expect(await projectFilePaths(ctx)).toEqual(MASTER_SOURCE_FILE_PATHS);
  });

  // Bug 4 doesn't apply here (no branch involved at all), so this is expected to PASS regardless of
  // that history - a second upload of byte-identical local files must take the update path, not
  // create, and must not fail or duplicate anything.
  test('updates the existing sources without creating anything new', async () => {
    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toContain('created');
    expect(result.stdout).toContain("File 'en/src/main/resources/android.xml'");
    expect(result.stdout).toContain("File 'en/src/main/resources/org/crowdin/android.xml'");
    expect(result.stdout).toContain("File 'en/src/main/resources/org/crowdin/strings.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();

    expect(await projectFilePaths(ctx)).toEqual(MASTER_SOURCE_FILE_PATHS);
  });

  test('previews uploading translations as a dry run', async () => {
    const result = await ctx.runner.run(['upload', 'translations', '--dryrun']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('File it/src/main/resources/android.xml would be queued for translations import');
    expect(result.stdout).toContain(
      'File uk/src/main/resources/org/crowdin/strings.xml would be queued for translations import',
    );
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads translations for it and uk', async () => {
    const result = await ctx.runner.run(['upload', 'translations']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Importing translations for file 'it/src/main/resources/android.xml'");
    expect(result.stdout).toContain("Importing translations for file 'uk/src/main/resources/org/crowdin/strings.xml'");
    expect(result.stdout).toContain("File 'it/src/main/resources/android.xml'");
    expect(result.stdout).toContain("File 'it/src/main/resources/org/crowdin/android.xml'");
    expect(result.stdout).toContain("File 'it/src/main/resources/org/crowdin/strings.xml'");
    expect(result.stdout).toContain("File 'uk/src/main/resources/android.xml'");
    expect(result.stdout).toContain("File 'uk/src/main/resources/org/crowdin/android.xml'");
    expect(result.stdout).toContain("File 'uk/src/main/resources/org/crowdin/strings.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('previews downloading translations as a dry run', async () => {
    const result = await ctx.runner.run(['download', 'translations', '--dryrun']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('it/src/main/resources/android.xml');
    expect(result.stdout).toContain('uk/src/main/resources/org/crowdin/strings.xml');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations, overwriting the local it/uk trees', async () => {
    // Mirrors the PHP original's `Common::RecursivelyRemoveDirectory` calls: prove the download
    // recreates these from the server rather than merely finding them already on disk.
    await rm(join(ctx.workspace, 'files', 'it'), { recursive: true, force: true });
    await rm(join(ctx.workspace, 'files', 'uk'), { recursive: true, force: true });

    const result = await ctx.runner.run(['download', 'translations']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('File it/src/main/resources/android.xml extracted');
    expect(result.stdout).toContain('File uk/src/main/resources/org/crowdin/strings.xml extracted');
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesExist(
      ctx.workspace,
      'files/it/src/main/resources/android.xml',
      'files/it/src/main/resources/org/crowdin/android.xml',
      'files/it/src/main/resources/org/crowdin/strings.xml',
      'files/uk/src/main/resources/android.xml',
      'files/uk/src/main/resources/org/crowdin/android.xml',
      'files/uk/src/main/resources/org/crowdin/strings.xml',
    );

    expect(await Bun.file(join(ctx.workspace, 'files/it/src/main/resources/android.xml')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/it/src/main/resources/android.xml')).text(),
    );
    expect(await Bun.file(join(ctx.workspace, 'files/it/src/main/resources/org/crowdin/strings.xml')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/it/src/main/resources/org/crowdin/strings.xml')).text(),
    );
    expect(await Bun.file(join(ctx.workspace, 'files/uk/src/main/resources/android.xml')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/uk/src/main/resources/android.xml')).text(),
    );
    expect(await Bun.file(join(ctx.workspace, 'files/uk/src/main/resources/org/crowdin/strings.xml')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/uk/src/main/resources/org/crowdin/strings.xml')).text(),
    );

    expect(await listFilesRecursively(join(ctx.workspace, 'files'))).toEqual(EXPECTED_LOCAL_FILES_AFTER_DOWNLOAD);
  });

  // --- Branch coverage from here: the SAME local tree uploaded again under a brand-new branch. ---

  test('uploads sources to a brand-new branch, creating the directory hierarchy again', async () => {
    const result = await ctx.runner.run(['upload', 'sources', '-b', 'test-branch']);

    expect(result.exitCode).toBe(0);
    // Directories are per-branch entities in Crowdin, so the branch gets its own fresh set even
    // though a same-named tree already exists on master; messages use the LOCAL path (no
    // "test-branch/" prefix), matching file-tree.test.ts's confirmed branch-upload wording.
    expect(result.stdout).toContain('Directory en created');
    expect(result.stdout).toContain('Directory crowdin created');
    expect(result.stdout).toContain("File 'en/src/main/resources/android.xml'");
    expect(result.stdout).toContain("File 'en/src/main/resources/org/crowdin/android.xml'");
    expect(result.stdout).toContain("File 'en/src/main/resources/org/crowdin/strings.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();

    expect(await projectFilePaths(ctx)).toEqual([...MASTER_SOURCE_FILE_PATHS, ...BRANCH_SOURCE_FILE_PATHS].sort());
  });

  // Bug 4 (see top-of-file comment): fixed 2026-07-21, one day before this port. This asserts the
  // correct/intended (PHP-parity) update behavior - expected to PASS, not fail. If it fails live,
  // that's new information, not a repeat of the old Bug 4.
  test('updates sources on the branch (branch already exists)', async () => {
    const result = await ctx.runner.run(['upload', 'sources', '-b', 'test-branch']);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toContain('created');
    expect(result.stdout).toContain("File 'en/src/main/resources/android.xml'");
    expect(result.stdout).toContain("File 'en/src/main/resources/org/crowdin/android.xml'");
    expect(result.stdout).toContain("File 'en/src/main/resources/org/crowdin/strings.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();

    expect(await projectFilePaths(ctx)).toEqual([...MASTER_SOURCE_FILE_PATHS, ...BRANCH_SOURCE_FILE_PATHS].sort());
  });

  test('previews uploading translations as a dry run on the branch', async () => {
    const result = await ctx.runner.run(['upload', 'translations', '--dryrun', '-b', 'test-branch']);

    expect(result.exitCode).toBe(0);
    // Dry-run listing is driven purely by local file existence at the same local destination paths
    // used on master (the config has no branch-name placeholder), so this is expected to read
    // identically to the non-branch dry run above.
    expect(result.stdout).toContain('File it/src/main/resources/android.xml would be queued for translations import');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  // Deliberately ported literally without "-b test-branch" - see deviation #2 in the top-of-file
  // comment. This re-uploads/replaces the translations already sitting on the MASTER files (uploaded
  // a few tests above), NOT the branch's own files.
  test('re-uploads translations to the already-translated master files (no -b, matching the literal PHP call)', async () => {
    const result = await ctx.runner.run(['upload', 'translations']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Importing translations for file 'it/src/main/resources/android.xml'");
    expect(result.stdout).toContain("File 'it/src/main/resources/android.xml'");
    expect(result.stdout).toContain("File 'uk/src/main/resources/org/crowdin/strings.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('previews downloading translations on the branch as a dry run', async () => {
    const result = await ctx.runner.run(['download', 'translations', '-b', 'test-branch', '--dryrun']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('it/src/main/resources/android.xml');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations on the branch', async () => {
    await rm(join(ctx.workspace, 'files', 'it'), { recursive: true, force: true });
    await rm(join(ctx.workspace, 'files', 'uk'), { recursive: true, force: true });

    const result = await ctx.runner.run(['download', 'translations', '-b', 'test-branch']);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('File it/src/main/resources/android.xml extracted');
    expect(result.stdout).toContain('File uk/src/main/resources/org/crowdin/strings.xml extracted');
    expect(normalize(result.stdout)).toMatchSnapshot();

    // Only existence is asserted here, deliberately NOT content equality against `expected/` - see
    // deviation #2 in the top-of-file comment: this build is scoped to the branch's own files, which
    // never received a translation upload, so its content is an open question for the first live run.
    await expectFilesExist(
      ctx.workspace,
      'files/it/src/main/resources/android.xml',
      'files/it/src/main/resources/org/crowdin/android.xml',
      'files/it/src/main/resources/org/crowdin/strings.xml',
      'files/uk/src/main/resources/android.xml',
      'files/uk/src/main/resources/org/crowdin/android.xml',
      'files/uk/src/main/resources/org/crowdin/strings.xml',
    );

    // The branch build downloads into the exact same local destination as the master build (the
    // local landing path never carries the branch name), so the file SET is unchanged even though
    // content correctness is an open question here (see the top-of-file comment, deviation #2).
    expect(await listFilesRecursively(join(ctx.workspace, 'files'))).toEqual(EXPECTED_LOCAL_FILES_AFTER_DOWNLOAD);
  });
});
