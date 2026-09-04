import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * Port of crowdin-backend/tests/Cli/Common/CliUploadSingleFileTest.php: uploading one file via a
 * single-file `-s`/`-t` pair, alone and in combination with a config file, `--dest`, an empty file,
 * an empty `files:` group, a branch, and `--preserve-hierarchy`.
 *
 * Two rules shape how the whole suite reads:
 *
 * 1. A CLI `--source`+`--translation` pair REPLACES `config.files` rather than merging into it, so
 *    every test passing both uploads the same single file whether or not a config file is present -
 *    the config only supplies credentials and paths.
 * 2. `preserve_hierarchy` is true for every upload here (the fixture's own value; `noConfig: true`
 *    only drops the `-c` flag, and the config is still auto-discovered). So the local `sources/`
 *    prefix reaches the project path from the first test on, the `sources` directory is created
 *    once and never again, and the final test's explicit `--preserve-hierarchy` changes nothing -
 *    it exists for 1:1 parity with the PHP original.
 *
 * `upload sources` always reports the LOCAL file path, so the assertions never change shape between
 * the plain and `--dest`/branch tests; only the snapshots and the one API check observe the
 * project-side path.
 */
describe('upload single file', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    ctx = await setupSuite('upload-single-file');
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('uploads a single file via short flag params with no config file', async () => {
    const result = await ctx.runner.run(
      [
        'upload',
        'sources',
        '-s',
        'sources/1_android.xml',
        '-t',
        '/translations/%two_letters_code%/%original_file_name%',
        '-i',
        String(ctx.project.id),
        '-T',
        ctx.env.token as string,
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
    expect(result.stdout).toContain('Fetching project info');
    // Success echoes the project path; with no `--dest` here it equals the local one.
    expect(result.stdout).toContain("File 'sources/1_android.xml'");
    // First upload in the suite, so the `sources` directory is created here and nowhere else.
    expect(result.stdout).toContain("Directory 'sources'");

    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads the same file via long flag params with no config file', async () => {
    const result = await ctx.runner.run(
      [
        'upload',
        'sources',
        '--source',
        'sources/1_android.xml',
        '--translation',
        '/translations/%two_letters_code%/%original_file_name%',
        '--project-id',
        String(ctx.project.id),
        '--token',
        ctx.env.token as string,
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
    expect(result.stdout).toContain('Fetching project info');
    expect(result.stdout).toContain("File 'sources/1_android.xml'");
    // Both the directory and the file already exist, so this is an update.
    expect(result.stdout).not.toContain("Directory 'sources'");

    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads the same file combined with a config file, replacing its files entry', async () => {
    // Same single-file upload as above; only the credentials now come from the config file.
    const result = await ctx.runner.run([
      'upload',
      'sources',
      '-s',
      'sources/1_android.xml',
      '-t',
      '/translations/%locale%/%original_file_name%',
    ]);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Fetching project info');
    expect(result.stdout).toContain("File 'sources/1_android.xml'");
    expect(result.stdout).not.toContain("Directory 'sources'");

    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads the same file combined with a config file and an explicit --dest', async () => {
    const result = await ctx.runner.run([
      'upload',
      'sources',
      '-s',
      'sources/1_android.xml',
      '-t',
      '/translations/%locale%/%original_file_name%',
      '--dest',
      '/sources/androidDest.xml',
    ]);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Fetching project info');
    expect(result.stdout).toContain("File 'sources/androidDest.xml'");
    expect(result.stdout).not.toContain("Directory 'sources'");

    expect(normalize(result.stdout)).toMatchSnapshot();

    // stdout never shows the `--dest`-resolved project path, so the API is the only witness.
    const files = await ctx.client.sourceFilesApi.listProjectFiles(ctx.project.id, { recursion: '1' });
    const destFile = files.data.find((file) => file.data.path === '/sources/androidDest.xml');
    expect(destFile).toBeDefined();
  });

  test('uploads an empty file, which is skipped with a warning', async () => {
    const result = await ctx.runner.run([
      'upload',
      'sources',
      '-s',
      'sources/empty_android.xml',
      '-t',
      '/translations/%locale%/%original_file_name%',
    ]);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    // A skipped file warns without failing the run.
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Fetching project info');
    expect(result.stderr).toContain("File 'sources/empty_android.xml' was skipped since it is empty");

    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test("uploads every file from the config's own file group, skipping the empty ones", async () => {
    // The one test driven by the fixture's own `files:` group: 1_android.xml updates, 2_android.xml
    // is created, and the two empty files are skipped with a warning each.
    const result = await ctx.runner.run(['upload', 'sources']);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Fetching project info');
    expect(result.stderr).toContain("File 'sources/empty_android.xml' was skipped since it is empty");
    expect(result.stderr).toContain("File 'sources/empty_android2.xml' was skipped since it is empty");
    expect(result.stdout).toContain("File 'sources/1_android.xml'");
    expect(result.stdout).toContain("File 'sources/2_android.xml'");
    expect(result.stdout).not.toContain("Directory 'sources'");

    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads an empty file to a new branch, still skipped with a warning', async () => {
    const result = await ctx.runner.run([
      'upload',
      'sources',
      '-b',
      'test',
      '-s',
      'sources/empty_android.xml',
      '-t',
      '/translations/%locale%/%original_file_name%',
    ]);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Fetching project info');
    // The branch is created silently, and the empty-file warning names the bare local path - not
    // the PHP original's branch-prefixed project path.
    expect(result.stderr).toContain("File 'sources/empty_android.xml' was skipped since it is empty");

    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads the same file again with --preserve-hierarchy explicitly set', async () => {
    // Matches the value already in effect; kept for parity with the PHP original.
    const result = await ctx.runner.run([
      'upload',
      'sources',
      '-s',
      'sources/1_android.xml',
      '-t',
      '/translations/%locale%/%original_file_name%',
      '--preserve-hierarchy',
    ]);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Fetching project info');
    expect(result.stdout).toContain("File 'sources/1_android.xml'");

    expect(normalize(result.stdout)).toMatchSnapshot();
  });
});
