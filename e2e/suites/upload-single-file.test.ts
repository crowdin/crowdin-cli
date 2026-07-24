import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * Port of crowdin-backend/tests/Cli/Common/CliUploadSingleFileTest.php: uploading one file via a
 * single-file `-s`/`-t` (or `--source`/`--translation`) pair, on its own, combined with a config
 * file, combined with a config file plus `--dest`, with an empty file, with an empty `files:`
 * config group, with an empty file uploaded to a branch, and with `--preserve-hierarchy`.
 *
 * Two things confirmed directly from source this session, both load-bearing for how this suite
 * reads:
 *
 * 1. `cli/config.ts`'s `cliLayer()` treats a CLI-given `--source`+`--translation` pair as a full
 *    REPLACEMENT of `config.files`, not a merge -- confirmed by reading `cliLayer()` directly
 *    (`if (options.source && options.translation) { layer.files = [{ source, translation, ...dest
 *    }] }`, unconditionally overwriting whatever `config.files` the file/other layers produced).
 *    So every test below that passes both flags (all except "uploads every file from the config's
 *    own file group") exercises the *identical* single-file upload regardless of whether a config
 *    file is also present -- the "combined with a config file" tests only differ from the
 *    no-config tests in *where the credentials/base_path/base_url come from*, never in which file
 *    gets uploaded or how. This mirrors the same rule already confirmed by
 *    invalid-files-config.test.ts.
 * 2. Bug 6 (see crowdin-cli-known-bugs.md): `cli/config.ts`'s `cliLayer()` unconditionally applies
 *    `preserveHierarchy: options.preserveHierarchy`, and Commander's `--no-preserve-hierarchy`
 *    negatable boolean defaults `options.preserveHierarchy` to `true` even when neither
 *    `--preserve-hierarchy` nor `--no-preserve-hierarchy` is passed. So `config.preserveHierarchy`
 *    resolves to `true` for *every* upload in this suite, not only the one test that passes
 *    `--preserve-hierarchy` explicitly. Concretely, this means: (a) the local `sources/` prefix is
 *    carried into the project path from the very first upload in this file, not deferred to the
 *    `--dest` test the way the PHP original assumes (PHP's Java-descended CLI defaults
 *    `preserve_hierarchy` to `false`, stripping the single file's containing directory); (b) the
 *    project ends up with a `sources` directory created by the very first test, so no later test in
 *    this file ever prints a `Directory sources created` line; (c) the final test's explicit
 *    `--preserve-hierarchy` is a no-op relative to the default already in effect throughout --
 *    included only to keep 1:1 method parity with the PHP original, not because it changes anything
 *    observable here. None of this is worked around (no `--no-preserve-hierarchy` added to "fix"
 *    the default) -- the suite asserts the real, current behavior.
 *
 * Also note: `output.success`/`output.warning` for `upload sources` always report the local file
 * path (confirmed at UploadSourcesCommand.ts, and by every prior suite that upload sources), never
 * the project-side path `--dest` or `preserve_hierarchy` computes -- so unlike the PHP original,
 * this suite's assertions never change shape between the plain-path and `--dest`/branch tests; only
 * `toMatchSnapshot()` and the one direct API check in the `--dest` test observe the project-side
 * path at all.
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
    // Confirmed wording at UploadSourcesCommand.ts -- always the local path, create or update alike.
    expect(result.stdout).toContain("File 'sources/1_android.xml'");
    // First upload in the suite: the project has no `sources` directory yet, and (per Bug 6 above)
    // `preserveHierarchy` resolves to `true` by default, so the local `sources/` prefix carries
    // straight into the project path and the directory has to be created here.
    expect(result.stdout).toContain('Directory sources created');

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
    // The project's `sources` directory and the file itself both already exist from the previous
    // test, so this is an update, not a create -- no second directory-creation line.
    expect(result.stdout).not.toContain('Directory sources created');

    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads the same file combined with a config file, replacing its files entry', async () => {
    // The fixture's crowdin.yml has its own `files:` entry ('/sources/*.xml'), but per this file's
    // top comment, a CLI-given --source/--translation pair fully replaces it -- so this exercises
    // the identical single-file upload as the previous two tests, just sourcing credentials/
    // base_path/base_url from the config file instead of -i/-T/--base-url.
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
    expect(result.stdout).not.toContain('Directory sources created');

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
    // Still the local path, not the `--dest`-resolved project path 'sources/androidDest.xml' -- see
    // this file's top comment. The `sources` directory already exists (created by the first test),
    // so no directory-creation line here either, even though this creates a brand-new project file.
    expect(result.stdout).toContain("File 'sources/1_android.xml'");
    expect(result.stdout).not.toContain('Directory sources created');

    expect(normalize(result.stdout)).toMatchSnapshot();

    // The only way to actually observe the `--dest`-resolved project path is via the API -- stdout
    // never shows it (see above).
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

    // A CLI warning does not set a non-zero exit code (confirmed by prior ports): the per-file task
    // just warns and returns, never touching `hasErrors`.
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Fetching project info');
    // Confirmed wording at UploadSourcesCommand.ts: `output.warning(\`File '${localFilePath}' was
    // skipped since it is empty\`)`, hit before any existing-file/directory logic runs.
    expect(result.stdout).toContain("File 'sources/empty_android.xml' was skipped since it is empty");

    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test("uploads every file from the config's own file group, skipping the empty ones", async () => {
    // No -s/-t here, so this is the one test in the suite actually driven by the fixture's
    // `files:` entry ('/sources/*.xml'), matching 4 local files: the two already-uploaded
    // 1_android.xml (update) and androidDest.xml's source 1_android.xml again, plus 2_android.xml
    // (brand new, create) and the two empty files (skipped with a warning each).
    //
    // This does NOT hit Bug 10 (upload sources aborting the whole command on a zero-match file
    // group, see crowdin-cli-known-bugs.md): the group's pattern matches 4 real local files, so
    // `patternFilePaths` never sees an empty `files` array for this group -- the empty-file skip
    // happens per-file, inside each task, well after the zero-match check that Bug 10 lives in.
    const result = await ctx.runner.run(['upload', 'sources']);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Fetching project info');
    expect(result.stdout).toContain("File 'sources/empty_android.xml' was skipped since it is empty");
    expect(result.stdout).toContain("File 'sources/empty_android2.xml' was skipped since it is empty");
    expect(result.stdout).toContain("File 'sources/1_android.xml'");
    expect(result.stdout).toContain("File 'sources/2_android.xml'");
    // 2_android.xml is new; 1_android.xml already exists -- but the `sources` directory itself was
    // already created by the very first test in this file, so no directory-creation line either way.
    expect(result.stdout).not.toContain('Directory sources created');

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
    // No branch-creation message at all -- `branchService.getOrCreateBranch()` silently creates the
    // brand-new 'test' branch (confirmed at BranchService.ts and by branches.test.ts's equivalent
    // finding). The empty-file warning also carries no branch prefix -- it is always the bare local
    // path, unlike the PHP original's project-path-based "test/empty_android.xml".
    expect(result.stdout).toContain("File 'sources/empty_android.xml' was skipped since it is empty");

    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads the same file again with --preserve-hierarchy explicitly set', async () => {
    // Per Bug 6 (this file's top comment), `--preserve-hierarchy` here is a no-op: the default
    // already resolves to `true` for every upload in this suite. Kept only for 1:1 parity with the
    // PHP original's method count -- it does not exercise anything the earlier tests didn't already.
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
