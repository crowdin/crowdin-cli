import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * Ported from `crowdin-backend/tests/Cli/Common/CliFileTreeTest.php`. Exercises `upload sources` /
 * `upload translations` / `download translations` / `file list` against a real (trimmed) NetBeans
 * PHP-module source tree, both on the default branch and on a brand-new branch, asserting the deep
 * nested directory hierarchy gets created correctly and the exact set of server-side file paths.
 *
 * Two deliberate deviations from a literal 1:1 port, both already covered by this porting effort's
 * `crowdin-cli-known-bugs` notes:
 *
 * 1. The fixture's `translation:` pattern is `/%two_letters_code%/php/**\/Bundle.properties`, NOT the
 *    PHP original's `/%two_letters_code%/%original_path%/Bundle.properties`. Verified directly
 *    against `TranslationPathResolver.resolveWithConfig` (`src-next/lib/config/translationPathResolver.ts`)
 *    this session: `%original_path%` resolves to the FULL matched source path *including the
 *    filename* (not just its containing directory, unlike the old Java/PHP CLI) - this is the
 *    already-known, separately-tracked "Bug 7". With the literal PHP pattern, every resolved
 *    translation path would come out as e.g.
 *    `uk/php/hudson.php/.../resources/Bundle.properties/Bundle.properties` (doubled filename),
 *    which matches no real file on disk and would make every `upload translations` task warn "does
 *    not exist" - swamping this suite (whose actual subject is directory-tree/branch handling) with
 *    an unrelated, already-covered bug. The `**`-based pattern used here was confirmed (via a
 *    throwaway script calling `replaceDoubleAsterisk`/`resolveWithConfig` directly, offline, no
 *    token needed) to resolve to the exact same local paths the PHP test expects
 *    (`uk/php/hudson.php/.../resources/Bundle.properties`), without touching the buggy placeholder.
 * 2. `crowdin-cli-known-bugs`'s "Bug 4" (re-uploading sources/translations to an already-existing
 *    branch always failed, because the existing-file lookup ignored the branch-name prefix Crowdin
 *    includes in `file.data.path`) is referenced by this port's task brief as still open, with tests
 *    8/9 below expected to go red. Reading the current source this session shows it was already
 *    fixed in commit `aee7318c` ("fix: strip branch prefix from project file paths", 2026-07-21,
 *    one day before this port): `UploadSourcesCommand.ts`, `UploadTranslationsCommand.ts`,
 *    `FileCommand.ts` and `obsoleteEntries.ts` all now route existing-file/-directory lookups
 *    through `stripBranchPrefix` (`src-next/lib/utils/path.ts`, with its own passing unit tests).
 *    So the branch re-upload/re-translate tests below are written with the correct/intended
 *    (PHP-parity) assertions and are, per this static reading, expected to PASS now - not fail.
 *    This suite has not been run live (no `CROWDIN_E2E_TOKEN` in this session); treat any live
 *    failure there as new information, not a repeat of the already-fixed Bug 4.
 */

const EXPECTED_LOCAL_FILES_AFTER_DOWNLOAD = [
  'it/php/hudson.php/src/org/netbeans/modules/hudson/php/resources/Bundle.properties',
  'it/php/libs.javacup/src/org/netbeans/libs/javacup/Bundle.properties',
  'it/php/php.api.annotation/src/org/netbeans/modules/php/api/annotation/resources/Bundle.properties',
  'it/php/php.api.documentation/src/org/netbeans/modules/php/api/documentation/resources/Bundle.properties',
  'it/php/php.api.editor/src/org/netbeans/modules/php/api/editor/resources/Bundle.properties',
  'php/hudson.php/nbproject/project.properties',
  'php/hudson.php/src/org/netbeans/modules/hudson/php/resources/Bundle.properties',
  'php/hudson.php/src/org/netbeans/modules/hudson/php/ui/options/HudsonOptionsPanel.form',
  'php/libs.javacup/external/binaries-list',
  'php/libs.javacup/external/java-cup-11a-license.txt',
  'php/libs.javacup/src/org/netbeans/libs/javacup/Bundle.properties',
  'php/php.api.annotation/nbproject/project.properties',
  'php/php.api.annotation/src/org/netbeans/modules/php/api/annotation/resources/Bundle.properties',
  'php/php.api.documentation/nbproject/project.properties',
  'php/php.api.documentation/src/org/netbeans/modules/php/api/documentation/resources/Bundle.properties',
  'php/php.api.editor/nbproject/project.properties',
  'php/php.api.editor/src/org/netbeans/modules/php/api/editor/resources/Bundle.properties',
  'uk/php/hudson.php/src/org/netbeans/modules/hudson/php/resources/Bundle.properties',
  'uk/php/libs.javacup/src/org/netbeans/libs/javacup/Bundle.properties',
  'uk/php/php.api.annotation/src/org/netbeans/modules/php/api/annotation/resources/Bundle.properties',
  'uk/php/php.api.documentation/src/org/netbeans/modules/php/api/documentation/resources/Bundle.properties',
  'uk/php/php.api.editor/src/org/netbeans/modules/php/api/editor/resources/Bundle.properties',
].sort();

const MASTER_SOURCE_FILE_PATHS = [
  '/php/hudson.php/src/org/netbeans/modules/hudson/php/resources/Bundle.properties',
  '/php/libs.javacup/src/org/netbeans/libs/javacup/Bundle.properties',
  '/php/php.api.annotation/src/org/netbeans/modules/php/api/annotation/resources/Bundle.properties',
  '/php/php.api.documentation/src/org/netbeans/modules/php/api/documentation/resources/Bundle.properties',
  '/php/php.api.editor/src/org/netbeans/modules/php/api/editor/resources/Bundle.properties',
].sort();

const BRANCH_SOURCE_FILE_PATHS = MASTER_SOURCE_FILE_PATHS.map((path) => `/branch1${path}`).sort();

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

describe('file tree', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    ctx = await setupSuite('file-tree', { targetLanguageIds: ['it', 'uk'] });
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('previews uploading sources as a dry run', async () => {
    const result = await ctx.runner.run(['upload', 'sources', '--dryrun']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(
      'File php/hudson.php/src/org/netbeans/modules/hudson/php/resources/Bundle.properties would be created',
    );
    expect(result.stdout).toContain(
      'File php/libs.javacup/src/org/netbeans/libs/javacup/Bundle.properties would be created',
    );
    expect(result.stdout).toContain(
      'File php/php.api.annotation/src/org/netbeans/modules/php/api/annotation/resources/Bundle.properties would be created',
    );
    expect(result.stdout).toContain(
      'File php/php.api.documentation/src/org/netbeans/modules/php/api/documentation/resources/Bundle.properties would be created',
    );
    expect(result.stdout).toContain(
      'File php/php.api.editor/src/org/netbeans/modules/php/api/editor/resources/Bundle.properties would be created',
    );
    // Dryrun never creates anything server-side, so no "Directory ... created" line should appear
    // (only "File ... would be created" info lines, checked above).
    expect(result.stdout).not.toContain('Directory ');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads sources, creating the full nested directory hierarchy', async () => {
    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);
    // Representative sample of the 42 distinct directories this creates; the rest is snapshotted.
    expect(result.stdout).toContain('Directory php created');
    expect(result.stdout).toContain('Directory hudson.php created');
    expect(result.stdout).toContain('Directory resources created');
    expect(result.stdout).toContain('Directory javacup created');
    expect(result.stdout).toContain(
      "File 'php/hudson.php/src/org/netbeans/modules/hudson/php/resources/Bundle.properties'",
    );
    expect(result.stdout).toContain("File 'php/libs.javacup/src/org/netbeans/libs/javacup/Bundle.properties'");
    expect(result.stdout).toContain(
      "File 'php/php.api.annotation/src/org/netbeans/modules/php/api/annotation/resources/Bundle.properties'",
    );
    expect(result.stdout).toContain(
      "File 'php/php.api.documentation/src/org/netbeans/modules/php/api/documentation/resources/Bundle.properties'",
    );
    expect(result.stdout).toContain(
      "File 'php/php.api.editor/src/org/netbeans/modules/php/api/editor/resources/Bundle.properties'",
    );
    expect(normalize(result.stdout)).toMatchSnapshot();

    expect(await projectFilePaths(ctx)).toEqual(MASTER_SOURCE_FILE_PATHS);
  });

  test('updates the existing sources (no new directories)', async () => {
    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toContain('created');
    expect(result.stdout).toContain(
      "File 'php/hudson.php/src/org/netbeans/modules/hudson/php/resources/Bundle.properties'",
    );
    expect(result.stdout).toContain("File 'php/libs.javacup/src/org/netbeans/libs/javacup/Bundle.properties'");
    expect(result.stdout).toContain(
      "File 'php/php.api.annotation/src/org/netbeans/modules/php/api/annotation/resources/Bundle.properties'",
    );
    expect(result.stdout).toContain(
      "File 'php/php.api.documentation/src/org/netbeans/modules/php/api/documentation/resources/Bundle.properties'",
    );
    expect(result.stdout).toContain(
      "File 'php/php.api.editor/src/org/netbeans/modules/php/api/editor/resources/Bundle.properties'",
    );
    expect(normalize(result.stdout)).toMatchSnapshot();

    expect(await projectFilePaths(ctx)).toEqual(MASTER_SOURCE_FILE_PATHS);
  });

  test('uploads translations for a single language (uk)', async () => {
    const result = await ctx.runner.run(['upload', 'translations', '-l', 'uk']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(
      "File 'uk/php/hudson.php/src/org/netbeans/modules/hudson/php/resources/Bundle.properties'",
    );
    expect(result.stdout).toContain("File 'uk/php/libs.javacup/src/org/netbeans/libs/javacup/Bundle.properties'");
    expect(result.stdout).toContain(
      "File 'uk/php/php.api.annotation/src/org/netbeans/modules/php/api/annotation/resources/Bundle.properties'",
    );
    expect(result.stdout).toContain(
      "File 'uk/php/php.api.documentation/src/org/netbeans/modules/php/api/documentation/resources/Bundle.properties'",
    );
    expect(result.stdout).toContain(
      "File 'uk/php/php.api.editor/src/org/netbeans/modules/php/api/editor/resources/Bundle.properties'",
    );
    expect(result.stdout).not.toContain("File 'it/");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads translations for all languages', async () => {
    const result = await ctx.runner.run(['upload', 'translations']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(
      "File 'it/php/hudson.php/src/org/netbeans/modules/hudson/php/resources/Bundle.properties'",
    );
    expect(result.stdout).toContain("File 'it/php/libs.javacup/src/org/netbeans/libs/javacup/Bundle.properties'");
    expect(result.stdout).toContain(
      "File 'it/php/php.api.annotation/src/org/netbeans/modules/php/api/annotation/resources/Bundle.properties'",
    );
    expect(result.stdout).toContain(
      "File 'it/php/php.api.documentation/src/org/netbeans/modules/php/api/documentation/resources/Bundle.properties'",
    );
    expect(result.stdout).toContain(
      "File 'it/php/php.api.editor/src/org/netbeans/modules/php/api/editor/resources/Bundle.properties'",
    );
    expect(result.stdout).toContain(
      "File 'uk/php/hudson.php/src/org/netbeans/modules/hudson/php/resources/Bundle.properties'",
    );
    expect(result.stdout).toContain("File 'uk/php/libs.javacup/src/org/netbeans/libs/javacup/Bundle.properties'");
    expect(result.stdout).toContain(
      "File 'uk/php/php.api.annotation/src/org/netbeans/modules/php/api/annotation/resources/Bundle.properties'",
    );
    expect(result.stdout).toContain(
      "File 'uk/php/php.api.documentation/src/org/netbeans/modules/php/api/documentation/resources/Bundle.properties'",
    );
    expect(result.stdout).toContain(
      "File 'uk/php/php.api.editor/src/org/netbeans/modules/php/api/editor/resources/Bundle.properties'",
    );
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('previews downloading translations as a dry run', async () => {
    const result = await ctx.runner.run(['download', 'translations', '--dryrun']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(
      'it/php/hudson.php/src/org/netbeans/modules/hudson/php/resources/Bundle.properties',
    );
    expect(result.stdout).toContain('uk/php/libs.javacup/src/org/netbeans/libs/javacup/Bundle.properties');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations, overwriting the local it/uk trees', async () => {
    // Mirrors the PHP original's `Common::RecursivelyRemoveDirectory` calls: prove the download
    // recreates these from the server rather than merely finding them already on disk.
    await rm(join(ctx.workspace, 'files', 'it'), { recursive: true, force: true });
    await rm(join(ctx.workspace, 'files', 'uk'), { recursive: true, force: true });

    const result = await ctx.runner.run(['download', 'translations']);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(
      'File it/php/hudson.php/src/org/netbeans/modules/hudson/php/resources/Bundle.properties extracted',
    );
    expect(result.stdout).toContain(
      'File uk/php/libs.javacup/src/org/netbeans/libs/javacup/Bundle.properties extracted',
    );
    expect(normalize(result.stdout)).toMatchSnapshot();

    expect(await listFilesRecursively(join(ctx.workspace, 'files'))).toEqual(EXPECTED_LOCAL_FILES_AFTER_DOWNLOAD);
  });

  test('lists the uploaded source files', async () => {
    const result = await ctx.runner.run(['file', 'list']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('php/hudson.php/src/org/netbeans/modules/hudson/php/resources/Bundle.properties');
    expect(result.stdout).toContain('php/libs.javacup/src/org/netbeans/libs/javacup/Bundle.properties');
    expect(result.stdout).toContain(
      'php/php.api.annotation/src/org/netbeans/modules/php/api/annotation/resources/Bundle.properties',
    );
    expect(result.stdout).toContain(
      'php/php.api.documentation/src/org/netbeans/modules/php/api/documentation/resources/Bundle.properties',
    );
    expect(result.stdout).toContain(
      'php/php.api.editor/src/org/netbeans/modules/php/api/editor/resources/Bundle.properties',
    );
  });

  // --- Branch coverage from here: the SAME local tree uploaded again under a brand-new branch. ---

  test('uploads sources to a brand-new branch, creating the directory hierarchy again', async () => {
    const result = await ctx.runner.run(['upload', 'sources', '-b', 'branch1']);

    expect(result.exitCode).toBe(0);
    // `upload sources -b <branch>` prints no branch-creation message at all (getOrCreateBranch is
    // silent) - confirmed by reading UploadSourcesCommand.ts, matching this effort's established
    // BranchCommand/UploadSourcesCommand wording note. Directory/file messages use the LOCAL path,
    // so they're identical strings to the non-branch upload above (no "branch1/" prefix).
    expect(result.stdout).toContain('Directory php created');
    expect(result.stdout).toContain('Directory hudson.php created');
    expect(result.stdout).toContain('Directory resources created');
    expect(result.stdout).toContain(
      "File 'php/hudson.php/src/org/netbeans/modules/hudson/php/resources/Bundle.properties'",
    );
    expect(result.stdout).toContain("File 'php/libs.javacup/src/org/netbeans/libs/javacup/Bundle.properties'");
    expect(result.stdout).toContain(
      "File 'php/php.api.annotation/src/org/netbeans/modules/php/api/annotation/resources/Bundle.properties'",
    );
    expect(result.stdout).toContain(
      "File 'php/php.api.documentation/src/org/netbeans/modules/php/api/documentation/resources/Bundle.properties'",
    );
    expect(result.stdout).toContain(
      "File 'php/php.api.editor/src/org/netbeans/modules/php/api/editor/resources/Bundle.properties'",
    );
    expect(normalize(result.stdout)).toMatchSnapshot();

    expect(await projectFilePaths(ctx)).toEqual([...MASTER_SOURCE_FILE_PATHS, ...BRANCH_SOURCE_FILE_PATHS].sort());
  });

  // Known-bug status: see the top-of-file comment. `crowdin-cli-known-bugs.md` "Bug 4" (branch
  // re-upload always failing) was fixed in commit aee7318c (2026-07-21), the day before this port -
  // `stripBranchPrefix` is now applied to the existing-file lookup in UploadSourcesCommand.ts. This
  // asserts the correct/intended (PHP-parity) update behavior; per this static reading it's expected
  // to PASS, not fail - if it fails live, that's new information, not a repeat of the old Bug 4.
  test('updates sources on the branch (branch already exists)', async () => {
    const result = await ctx.runner.run(['upload', 'sources', '-b', 'branch1']);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toContain('created');
    expect(result.stdout).toContain(
      "File 'php/hudson.php/src/org/netbeans/modules/hudson/php/resources/Bundle.properties'",
    );
    expect(result.stdout).toContain("File 'php/libs.javacup/src/org/netbeans/libs/javacup/Bundle.properties'");
    expect(result.stdout).toContain(
      "File 'php/php.api.annotation/src/org/netbeans/modules/php/api/annotation/resources/Bundle.properties'",
    );
    expect(result.stdout).toContain(
      "File 'php/php.api.documentation/src/org/netbeans/modules/php/api/documentation/resources/Bundle.properties'",
    );
    expect(result.stdout).toContain(
      "File 'php/php.api.editor/src/org/netbeans/modules/php/api/editor/resources/Bundle.properties'",
    );
    expect(normalize(result.stdout)).toMatchSnapshot();

    expect(await projectFilePaths(ctx)).toEqual([...MASTER_SOURCE_FILE_PATHS, ...BRANCH_SOURCE_FILE_PATHS].sort());
  });

  // Same known-bug status as the previous test (Bug 4 side affecting translation uploads on an
  // existing branch) - see the top-of-file comment. Expected to PASS per the same fix.
  test('uploads translations for a single language (uk) on the branch', async () => {
    const result = await ctx.runner.run(['upload', 'translations', '-b', 'branch1', '-l', 'uk']);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(
      "File 'uk/php/hudson.php/src/org/netbeans/modules/hudson/php/resources/Bundle.properties'",
    );
    expect(result.stdout).toContain("File 'uk/php/libs.javacup/src/org/netbeans/libs/javacup/Bundle.properties'");
    expect(result.stdout).toContain(
      "File 'uk/php/php.api.annotation/src/org/netbeans/modules/php/api/annotation/resources/Bundle.properties'",
    );
    expect(result.stdout).toContain(
      "File 'uk/php/php.api.documentation/src/org/netbeans/modules/php/api/documentation/resources/Bundle.properties'",
    );
    expect(result.stdout).toContain(
      "File 'uk/php/php.api.editor/src/org/netbeans/modules/php/api/editor/resources/Bundle.properties'",
    );
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads translations for all languages on the branch', async () => {
    const result = await ctx.runner.run(['upload', 'translations', '-b', 'branch1']);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(
      "File 'it/php/hudson.php/src/org/netbeans/modules/hudson/php/resources/Bundle.properties'",
    );
    expect(result.stdout).toContain("File 'it/php/libs.javacup/src/org/netbeans/libs/javacup/Bundle.properties'");
    expect(result.stdout).toContain(
      "File 'uk/php/hudson.php/src/org/netbeans/modules/hudson/php/resources/Bundle.properties'",
    );
    expect(result.stdout).toContain("File 'uk/php/libs.javacup/src/org/netbeans/libs/javacup/Bundle.properties'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('previews downloading translations on the branch as a dry run', async () => {
    const result = await ctx.runner.run(['download', 'translations', '-b', 'branch1', '--dryrun']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(
      'it/php/hudson.php/src/org/netbeans/modules/hudson/php/resources/Bundle.properties',
    );
    expect(result.stdout).toContain('uk/php/libs.javacup/src/org/netbeans/libs/javacup/Bundle.properties');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations on the branch, overwriting the local it/uk trees again', async () => {
    await rm(join(ctx.workspace, 'files', 'it'), { recursive: true, force: true });
    await rm(join(ctx.workspace, 'files', 'uk'), { recursive: true, force: true });

    const result = await ctx.runner.run(['download', 'translations', '-b', 'branch1']);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(
      'File it/php/hudson.php/src/org/netbeans/modules/hudson/php/resources/Bundle.properties extracted',
    );
    expect(result.stdout).toContain(
      'File uk/php/libs.javacup/src/org/netbeans/libs/javacup/Bundle.properties extracted',
    );
    expect(normalize(result.stdout)).toMatchSnapshot();

    // The branch build downloads into the exact same local destination as the master build (the
    // local landing path never carries the branch name), so the recursive listing is unchanged.
    expect(await listFilesRecursively(join(ctx.workspace, 'files'))).toEqual(EXPECTED_LOCAL_FILES_AFTER_DOWNLOAD);
  });

  test('lists source files on the branch', async () => {
    const result = await ctx.runner.run(['file', 'list', '-b', 'branch1']);

    expect(result.exitCode).toBe(0);
    // Unlike `upload`'s success messages, `file list`'s paths come straight from the server's raw
    // (branch-prefixed) `file.data.path` with only a leading-slash strip - no `stripBranchPrefix` -
    // so these DO carry the "branch1/" prefix, matching the PHP original.
    expect(result.stdout).toContain(
      'branch1/php/hudson.php/src/org/netbeans/modules/hudson/php/resources/Bundle.properties',
    );
    expect(result.stdout).toContain('branch1/php/libs.javacup/src/org/netbeans/libs/javacup/Bundle.properties');
    expect(result.stdout).toContain(
      'branch1/php/php.api.annotation/src/org/netbeans/modules/php/api/annotation/resources/Bundle.properties',
    );
    expect(result.stdout).toContain(
      'branch1/php/php.api.documentation/src/org/netbeans/modules/php/api/documentation/resources/Bundle.properties',
    );
    expect(result.stdout).toContain(
      'branch1/php/php.api.editor/src/org/netbeans/modules/php/api/editor/resources/Bundle.properties',
    );
  });
});
