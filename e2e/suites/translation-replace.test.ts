import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { expectFilesExist } from '../helpers/files.ts';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * Ported from `crowdin-backend/tests/Cli/Common/CliTranslationReplaceTest.php`. Exercises upload
 * sources / upload translations / download translations over a nested Android-resources tree, on the
 * default branch and on a new one - the real subject being a second `upload sources` to a file that
 * already exists, and how translations behave around it.
 *
 * PHP's `testUploadTranslationsBranch` calls the upload with no `-b test-branch`, unlike every other
 * branch method in that file. It is ported literally, so the branch's own sources never receive
 * translations and the branch download asserts existence only, not content.
 *
 * Unlike PHP's fixture, the translation content differs between it and uk, so a content assertion
 * can tell the languages apart.
 */

const MASTER_SOURCE_FILE_PATHS = [
  '/en/src/main/resources/android.xml',
  '/en/src/main/resources/org/crowdin/android.xml',
  '/en/src/main/resources/org/crowdin/strings.xml',
].sort();

const BRANCH_SOURCE_FILE_PATHS = MASTER_SOURCE_FILE_PATHS.map((path) => `/test-branch${path}`).sort();

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

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("Directory 'en'");
    expect(result.stdout).toContain("Directory 'en/src'");
    expect(result.stdout).toContain("Directory 'en/src/main'");
    expect(result.stdout).toContain("Directory 'en/src/main/resources'");
    expect(result.stdout).toContain("Directory 'en/src/main/resources/org'");
    expect(result.stdout).toContain("Directory 'en/src/main/resources/org/crowdin'");
    expect(result.stdout).toContain("File 'en/src/main/resources/android.xml'");
    expect(result.stdout).toContain("File 'en/src/main/resources/org/crowdin/android.xml'");
    expect(result.stdout).toContain("File 'en/src/main/resources/org/crowdin/strings.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();

    expect(await projectFilePaths(ctx)).toEqual(MASTER_SOURCE_FILE_PATHS);
  });

  test('updates the existing sources without creating anything new', async () => {
    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).not.toContain('created');
    expect(result.stdout).toContain("File 'en/src/main/resources/android.xml'");
    expect(result.stdout).toContain("File 'en/src/main/resources/org/crowdin/android.xml'");
    expect(result.stdout).toContain("File 'en/src/main/resources/org/crowdin/strings.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();

    expect(await projectFilePaths(ctx)).toEqual(MASTER_SOURCE_FILE_PATHS);
  });

  test('previews uploading translations as a dry run', async () => {
    const result = await ctx.runner.run(['upload', 'translations', '--dryrun']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("File 'it/src/main/resources/android.xml' would be queued for translations import");
    expect(result.stdout).toContain(
      "File 'uk/src/main/resources/org/crowdin/strings.xml' would be queued for translations import",
    );
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads translations for it and uk', async () => {
    const result = await ctx.runner.run(['upload', 'translations']);

    expect(result).toMatchObject({ exitCode: 0 });
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

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain('it/src/main/resources/android.xml');
    expect(result.stdout).toContain('uk/src/main/resources/org/crowdin/strings.xml');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations, overwriting the local it/uk trees', async () => {
    // Prove the download recreates these from the server rather than finding them on disk.
    await rm(join(ctx.workspace, 'files', 'it'), { recursive: true, force: true });
    await rm(join(ctx.workspace, 'files', 'uk'), { recursive: true, force: true });

    const result = await ctx.runner.run(['download', 'translations']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("File 'it/src/main/resources/android.xml' extracted");
    expect(result.stdout).toContain("File 'uk/src/main/resources/org/crowdin/strings.xml' extracted");
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

    expect(result).toMatchObject({ exitCode: 0 });
    // Directories are per-branch entities in Crowdin, so the branch gets its own fresh set; the paths
    // carry no "test-branch/" prefix.
    expect(result.stdout).toContain("Directory 'en'");
    expect(result.stdout).toContain("Directory 'en/src/main/resources/org/crowdin'");
    expect(result.stdout).toContain("File 'en/src/main/resources/android.xml'");
    expect(result.stdout).toContain("File 'en/src/main/resources/org/crowdin/android.xml'");
    expect(result.stdout).toContain("File 'en/src/main/resources/org/crowdin/strings.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();

    expect(await projectFilePaths(ctx)).toEqual([...MASTER_SOURCE_FILE_PATHS, ...BRANCH_SOURCE_FILE_PATHS].sort());
  });

  test('updates sources on the branch (branch already exists)', async () => {
    const result = await ctx.runner.run(['upload', 'sources', '-b', 'test-branch']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).not.toContain('created');
    expect(result.stdout).toContain("File 'en/src/main/resources/android.xml'");
    expect(result.stdout).toContain("File 'en/src/main/resources/org/crowdin/android.xml'");
    expect(result.stdout).toContain("File 'en/src/main/resources/org/crowdin/strings.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();

    expect(await projectFilePaths(ctx)).toEqual([...MASTER_SOURCE_FILE_PATHS, ...BRANCH_SOURCE_FILE_PATHS].sort());
  });

  test('previews uploading translations as a dry run on the branch', async () => {
    const result = await ctx.runner.run(['upload', 'translations', '--dryrun', '-b', 'test-branch']);

    expect(result).toMatchObject({ exitCode: 0 });
    // The config has no branch-name placeholder, so this reads identically to the non-branch dry run.
    expect(result.stdout).toContain("File 'it/src/main/resources/android.xml' would be queued for translations import");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  // No `-b`, as in PHP (see the file header): this replaces the translations on the MASTER files.
  test('re-uploads translations to the already-translated master files (no -b, matching the literal PHP call)', async () => {
    const result = await ctx.runner.run(['upload', 'translations']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("Importing translations for file 'it/src/main/resources/android.xml'");
    expect(result.stdout).toContain("File 'it/src/main/resources/android.xml'");
    expect(result.stdout).toContain("File 'uk/src/main/resources/org/crowdin/strings.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('previews downloading translations on the branch as a dry run', async () => {
    const result = await ctx.runner.run(['download', 'translations', '-b', 'test-branch', '--dryrun']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain('it/src/main/resources/android.xml');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations on the branch', async () => {
    await rm(join(ctx.workspace, 'files', 'it'), { recursive: true, force: true });
    await rm(join(ctx.workspace, 'files', 'uk'), { recursive: true, force: true });

    const result = await ctx.runner.run(['download', 'translations', '-b', 'test-branch']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("File 'it/src/main/resources/android.xml' extracted");
    expect(result.stdout).toContain("File 'uk/src/main/resources/org/crowdin/strings.xml' extracted");
    expect(normalize(result.stdout)).toMatchSnapshot();

    // Existence only: this build covers the branch's own files, which never received translations.
    await expectFilesExist(
      ctx.workspace,
      'files/it/src/main/resources/android.xml',
      'files/it/src/main/resources/org/crowdin/android.xml',
      'files/it/src/main/resources/org/crowdin/strings.xml',
      'files/uk/src/main/resources/android.xml',
      'files/uk/src/main/resources/org/crowdin/android.xml',
      'files/uk/src/main/resources/org/crowdin/strings.xml',
    );

    // The local landing path never carries the branch name, so the file set is unchanged.
    expect(await listFilesRecursively(join(ctx.workspace, 'files'))).toEqual(EXPECTED_LOCAL_FILES_AFTER_DOWNLOAD);
  });
});
