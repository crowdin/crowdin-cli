import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { captureAndClear, expectFilesExist, expectRestored } from '../helpers/files.ts';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, switchConfig, teardownSuite } from '../helpers/suite.ts';

/**
 * Port of crowdin-backend's `tests/Cli/Common/CliDestTest.php`: `dest:` pattern shapes across
 * several file groups, upload/download of their translations, the same pair against a branch, a
 * configless single-file upload with `--dest`, and a config-validation negative case.
 */
describe('dest', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    ctx = await setupSuite('dest', { targetLanguageIds: ['it', 'uk'] });
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  /** The paths the files actually occupy in the project, which is where `dest` resolution lands. */
  async function projectPaths(branchName?: string): Promise<string[]> {
    let branchId: number | undefined;

    if (branchName) {
      const branches = await ctx.client.sourceFilesApi.withFetchAll().listProjectBranches(ctx.project.id, {
        name: branchName,
      });

      branchId = branches.data.find((entry) => entry.data.name === branchName)?.data.id;

      if (branchId === undefined) {
        throw new Error(`Branch '${branchName}' not found via the API`);
      }
    }

    // `recursion` is what reaches the files nested in directories; without it the listing stops at
    // the branch (or project) root. Same call the CLI's own `loadProjectFiles` makes, including the
    // branch filter, since the recursive listing spans every branch.
    const files = await ctx.client.sourceFilesApi
      .withFetchAll()
      .listProjectFiles(ctx.project.id, { branchId, recursion: '1' });

    return files.data
      .filter((entry) => (entry.data.branchId ?? null) === (branchId ?? null))
      .map((entry) => entry.data.path)
      .sort();
  }

  const DEST_PATHS = [
    '/Android.xml',
    '/Folder/Android.xml',
    '/Folder/Client.xml',
    '/Test-destCheckFolder/xml/android/android.xml',
    '/Test-destCheckFolderParallelFileProcess/xml/android.xml',
    '/Test-destCheckFolderParallelFileProcess/xml/second_android.xml',
  ];

  test('uploads sources across dest-remapped file groups', async () => {
    const result = await ctx.runner.run(['upload', 'sources']);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);

    // Success echoes the `dest`-remapped project path, not the local one.
    expect(result.stdout).toContain("File 'Android.xml'");
    expect(result.stdout).toContain("Directory 'Folder'");
    expect(result.stdout).toContain("File 'Folder/Android.xml'");
    expect(result.stdout).toContain("File 'Folder/Client.xml'");
    expect(result.stdout).toContain("File 'Test-destCheckFolder/xml/android/android.xml'");
    expect(result.stdout).toContain("File 'Test-destCheckFolderParallelFileProcess/xml/android.xml'");
    expect(result.stdout).toContain("File 'Test-destCheckFolderParallelFileProcess/xml/second_android.xml'");

    expect(normalize(result.stdout)).toMatchSnapshot();

    // `%original_path%` is the source file's parent directory, so `destCheckFolder/android.xml` maps
    // onto `Test-destCheckFolder/xml/android/android.xml` - no directory named after the file itself.
    expect(await projectPaths()).toEqual(DEST_PATHS);
  });

  test('uploads translations across dest-remapped file groups', async () => {
    const result = await ctx.runner.run(['upload', 'translations']);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);

    // Local translation paths come from each group's `translation:` pattern alone - `dest` never
    // enters into them.
    for (const path of [
      'android_it_IT.xml',
      'android_uk_UA.xml',
      'folder/android_it_IT.xml',
      'folder/android_uk_UA.xml',
      'folder/client_it_IT.xml',
      'folder/client_uk_UA.xml',
      'destCheckFolder/android_it_IT.xml',
      'destCheckFolder/android_uk_UA.xml',
      'destCheckFolderParallelFileProcess/android_it_IT.xml',
      'destCheckFolderParallelFileProcess/android_uk_UA.xml',
      'destCheckFolderParallelFileProcess/second_android_it_IT.xml',
      'destCheckFolderParallelFileProcess/second_android_uk_UA.xml',
    ]) {
      expect(result.stdout).toContain(`Importing translations for file '${path}'`);
      expect(result.stdout).toContain(`File '${path}'`);
    }

    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations and matches the uploaded content for the parallel file group', async () => {
    // Each path already holds an upload fixture, so clear it first - otherwise the check compares
    // every file against itself and always passes.
    const captured = await captureAndClear(
      ctx.workspace,
      'android_it_IT.xml',
      'android_uk_UA.xml',
      'folder/android_it_IT.xml',
      'folder/android_uk_UA.xml',
      'folder/client_it_IT.xml',
      'folder/client_uk_UA.xml',
      'destCheckFolder/android_it_IT.xml',
      'destCheckFolder/android_uk_UA.xml',
      'destCheckFolderParallelFileProcess/android_it_IT.xml',
      'destCheckFolderParallelFileProcess/android_uk_UA.xml',
      'destCheckFolderParallelFileProcess/second_android_it_IT.xml',
      'destCheckFolderParallelFileProcess/second_android_uk_UA.xml',
    );

    const result = await ctx.runner.run(['download', 'translations']);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectRestored(ctx.workspace, captured);
  });

  test('uploads sources to a branch with dest remapping', async () => {
    const result = await ctx.runner.run(['upload', 'sources', '-b', 'test-branch']);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    // No branch-creation message is printed, here or in Java.
    expect(result.stdout).toContain("File 'Android.xml'");
    expect(result.stdout).toContain("Directory 'Folder'");
    expect(result.stdout).toContain("File 'Folder/Android.xml'");
    expect(result.stdout).toContain("File 'Folder/Client.xml'");

    expect(normalize(result.stdout)).toMatchSnapshot();

    // The branch holds the same dest-remapped tree, each path carrying the branch name.
    expect(await projectPaths('test-branch')).toEqual(DEST_PATHS.map((path) => `/test-branch${path}`));
  });

  test('uploads translations to the branch', async () => {
    const result = await ctx.runner.run(['upload', 'translations', '-b', 'test-branch']);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'android_it_IT.xml'");
    expect(result.stdout).toContain("File 'android_uk_UA.xml'");

    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations from the branch', async () => {
    const result = await ctx.runner.run(['download', 'translations', '-b', 'test-branch']);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesExist(ctx.workspace, 'android_it_IT.xml', 'android_uk_UA.xml');
  });

  test('uploads a single file with an explicit --dest and no config file', async () => {
    // `-s`/`-t` build a one-file config on their own, so no config file is read at all.
    const result = await ctx.runner.run(
      [
        'upload',
        'sources',
        '-s',
        'android.xml',
        '-t',
        '/translations/%two_letters_code%/%original_file_name%',
        '-i',
        String(ctx.project.id),
        '-T',
        ctx.env.token as string,
        '--dest',
        'SingleDest/%file_extension%/%file_name%/%original_file_name%',
        '--base-url',
        'https://api.crowdin.com',
        '--no-progress',
        '--no-colors',
      ],
      { noConfig: true },
    );

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Directory 'SingleDest'");
    expect(result.stdout).toContain("Directory 'SingleDest/xml'");
    expect(result.stdout).toContain("Directory 'SingleDest/xml/android'");
    expect(result.stdout).toContain("File 'SingleDest/xml/android/android.xml'");

    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('reports a configuration error for dest without preserve_hierarchy', async () => {
    // PHP expects this error for a glob `source` combined with a literal `dest`; src-next has no
    // source-arity check, only the `preserve_hierarchy` one exercised here.
    await switchConfig(ctx, 'crowdin-invalid');

    const result = await ctx.runner.run(['upload', 'sources', '--no-preserve-hierarchy']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain(
      "The 'dest' parameter only works for single files with the specified 'preserve_hierarchy': true option",
    );
  });
});
