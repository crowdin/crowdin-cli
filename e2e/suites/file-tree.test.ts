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

async function projectFilePaths(ctx: SuiteContext): Promise<string[]> {
  const files = await ctx.client.sourceFilesApi.listProjectFiles(ctx.project.id, { recursion: '1' });
  return files.data.map((file) => file.data.path).sort();
}

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

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain(
      "File 'php/hudson.php/src/org/netbeans/modules/hudson/php/resources/Bundle.properties' would be created",
    );
    expect(result.stdout).toContain(
      "File 'php/libs.javacup/src/org/netbeans/libs/javacup/Bundle.properties' would be created",
    );
    expect(result.stdout).toContain(
      "File 'php/php.api.annotation/src/org/netbeans/modules/php/api/annotation/resources/Bundle.properties' would be created",
    );
    expect(result.stdout).toContain(
      "File 'php/php.api.documentation/src/org/netbeans/modules/php/api/documentation/resources/Bundle.properties' would be created",
    );
    expect(result.stdout).toContain(
      "File 'php/php.api.editor/src/org/netbeans/modules/php/api/editor/resources/Bundle.properties' would be created",
    );
    expect(result.stdout).not.toContain('Directory ');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads sources, creating the full nested directory hierarchy', async () => {
    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result).toMatchObject({ exitCode: 0 });
    // Representative sample of the 42 distinct directories this creates; the rest is snapshotted.
    expect(result.stdout).toContain("Directory 'php'");
    expect(result.stdout).toContain("Directory 'php/hudson.php'");
    expect(result.stdout).toContain("Directory 'php/hudson.php/src/org/netbeans/modules/hudson/php/resources'");
    expect(result.stdout).toContain("Directory 'php/libs.javacup/src/org/netbeans/libs/javacup'");
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

    expect(result).toMatchObject({ exitCode: 0 });
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

    expect(result).toMatchObject({ exitCode: 0 });
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

    expect(result).toMatchObject({ exitCode: 0 });
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

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain(
      'it/php/hudson.php/src/org/netbeans/modules/hudson/php/resources/Bundle.properties',
    );
    expect(result.stdout).toContain('uk/php/libs.javacup/src/org/netbeans/libs/javacup/Bundle.properties');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations, overwriting the local it/uk trees', async () => {
    // Prove the download recreates these from the server rather than finding them on disk.
    await rm(join(ctx.workspace, 'files', 'it'), { recursive: true, force: true });
    await rm(join(ctx.workspace, 'files', 'uk'), { recursive: true, force: true });

    const result = await ctx.runner.run(['download', 'translations']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain(
      "File 'it/php/hudson.php/src/org/netbeans/modules/hudson/php/resources/Bundle.properties' extracted",
    );
    expect(result.stdout).toContain(
      "File 'uk/php/libs.javacup/src/org/netbeans/libs/javacup/Bundle.properties' extracted",
    );
    expect(normalize(result.stdout)).toMatchSnapshot();

    expect(await listFilesRecursively(join(ctx.workspace, 'files'))).toEqual(EXPECTED_LOCAL_FILES_AFTER_DOWNLOAD);
  });

  test('lists the uploaded source files', async () => {
    const result = await ctx.runner.run(['file', 'list']);

    expect(result).toMatchObject({ exitCode: 0 });
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

    expect(result).toMatchObject({ exitCode: 0 });
    // No branch-creation message, and the paths carry no "branch1/" prefix, so these match the
    // non-branch upload above.
    expect(result.stdout).toContain("Directory 'php'");
    expect(result.stdout).toContain("Directory 'php/hudson.php'");
    expect(result.stdout).toContain("Directory 'php/hudson.php/src/org/netbeans/modules/hudson/php/resources'");
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

  // The second upload to an existing branch is the update path: the existing-file lookup strips the
  // branch prefix, so nothing is re-created.
  test('updates sources on the branch (branch already exists)', async () => {
    const result = await ctx.runner.run(['upload', 'sources', '-b', 'branch1']);

    expect(result).toMatchObject({ exitCode: 0 });
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

  test('uploads translations for a single language (uk) on the branch', async () => {
    const result = await ctx.runner.run(['upload', 'translations', '-b', 'branch1', '-l', 'uk']);

    expect(result).toMatchObject({ exitCode: 0 });
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

    expect(result).toMatchObject({ exitCode: 0 });
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

    expect(result).toMatchObject({ exitCode: 0 });
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

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain(
      "File 'it/php/hudson.php/src/org/netbeans/modules/hudson/php/resources/Bundle.properties' extracted",
    );
    expect(result.stdout).toContain(
      "File 'uk/php/libs.javacup/src/org/netbeans/libs/javacup/Bundle.properties' extracted",
    );
    expect(normalize(result.stdout)).toMatchSnapshot();

    // The branch build downloads into the exact same local destination as the master build (the
    // local landing path never carries the branch name), so the recursive listing is unchanged.
    expect(await listFilesRecursively(join(ctx.workspace, 'files'))).toEqual(EXPECTED_LOCAL_FILES_AFTER_DOWNLOAD);
  });

  test('lists source files on the branch', async () => {
    const result = await ctx.runner.run(['file', 'list', '-b', 'branch1']);

    expect(result).toMatchObject({ exitCode: 0 });
    // Unlike upload's success messages, `file list` prints the raw server path, so these DO carry the
    // "branch1/" prefix.
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
});
