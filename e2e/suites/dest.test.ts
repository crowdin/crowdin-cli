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
