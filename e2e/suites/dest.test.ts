import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { captureAndClear, expectFilesExist, expectRestored } from '../helpers/files.ts';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, switchConfig, teardownSuite } from '../helpers/suite.ts';

/**
 * Port of crowdin-backend's `tests/Cli/Common/CliDestTest.php`: `dest:` pattern shapes across
 * several file groups (a plain file, a folder, a `dest`-remapped nested structure using
 * `%file_extension%`/%file_name%/%original_file_name%`/`%original_path%` placeholders, and two
 * "parallel file process" files sharing a dest pattern), upload/download of translations for all
 * of them, the same upload/download pair against a branch, a configless single-file upload with
 * `--dest`, and a config-validation negative case.
 *
 * Two behaviors confirmed directly this session (offline, no live API — see the comments at each
 * affected test) diverge from PHP/Java and are NOT fixed here, per the porting effort's rule of
 * flagging rather than papering over discovered bugs:
 *
 * 1. `%original_path%` resolves to the FULL relative local path (directory + file name), not just
 *    the containing directory as Java's CLI does. Confirmed via `lib/upload/fileOptions.ts`'s
 *    `prepareDest()` and mirrored in `lib/config/translationPathResolver.ts` (`case originalPath:
 *    return filePath` / `return localFilePath` — both return the whole path, commented "Full file
 *    path"). This makes the `destCheckFolder`/`destCheckFolderParallelFileProcess` file groups'
 *    server-side directory structure diverge from PHP's expectation (e.g. a literal directory
 *    named `android.xml` gets created), so this suite does not assert on those directory names.
 * 2. `preserve_hierarchy: false` in `crowdin.yml` has NO effect through the CLI for any files-tier
 *    command, unless `--no-preserve-hierarchy` is passed explicitly on the command line. Root
 *    cause: `noPreserveHierarchy` (`cli/commands/common/options.ts`) is registered as a Commander
 *    negatable boolean (`--no-preserve-hierarchy`) with `default: true`; Commander always supplies
 *    `true` for `options.preserveHierarchy` unless the flag is passed, and `cli/config.ts`'s
 *    `cliLayer()` unconditionally applies `preserveHierarchy: options.preserveHierarchy` as the
 *    last (highest-priority) config layer — so the config file's own value is only ever honored
 *    when the user explicitly negates the CLI default. This makes PHP's negative test (a glob
 *    `source` matching multiple files + a literal `dest`, expecting a validation error because
 *    `dest` only works for a single-file `source`) unreachable as written: `lib/config.ts`'s only
 *    `dest`-related rule checks `!config.preserveHierarchy`, not source arity, and that condition
 *    can never occur by default. See the last test in this file for how it's ported instead.
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

    // Confirmed wording (grepped from UploadSourcesCommand.ts): create/update success reports the
    // local file path, directory creation reports the bare last path segment. Only asserted for the
    // Success echoes the `dest`-remapped PROJECT path, not the local one, so each assertion below
    // names the destination the group maps its file to.
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

    // Local translation paths are resolved purely from each group's `translation:` pattern
    // (TranslationPathResolver.resolve is called without a `dest` option in
    // UploadTranslationsCommand.buildTranslationEntries), so these are unaffected by the
    // `%original_path%` divergence noted above and safe to assert exactly.
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
    // Every path below is where an upload fixture already sits, so the download has to be made to
    // prove itself: capture the content, delete it, and require the download to put it back. Reading
    // the content without clearing would compare each file against itself and always pass.
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
    // First upload to a brand-new branch: the existing-file lookup Map starts empty for it, so
    // nothing here depends on how server paths are keyed. Java/TS also print no branch-creation
    // message at all — confirmed in base-path.test.ts's port — so none is asserted here.
    expect(result.stdout).toContain("File 'Android.xml'");
    expect(result.stdout).toContain("Directory 'Folder'");
    expect(result.stdout).toContain("File 'Folder/Android.xml'");
    expect(result.stdout).toContain("File 'Folder/Client.xml'");

    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  // `fileService.loadProjectFiles(branchId)` returns branch-prefixed paths
  // (`test-branch/android.xml`), while the translation-side source-file lookup in
  // `UploadTranslationsCommand` computes a branch-agnostic project path. The two are reconciled by
  // `stripBranchPrefix` on the server paths before the lookup Map is built
  // (`UploadTranslationsCommand.ts`), so a branched upload resolves its source files and this
  // asserts the PHP-parity outcome.
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

  // Depends on the previous test's translations upload actually having imported translations into
  // the branch build.
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
    // Configless single-file upload mode IS supported in src-next: `cli/config.ts`'s `cliLayer()`
    // builds a one-file config from `-s`/`-t` (forcing `preserveHierarchy = true` when `--dest` is
    // also given), and `-i`/`-T`/`--base-url` are real options (confirmed in
    // `cli/commands/common/options.ts`: projectId short `-i`, token short `-T`, destination
    // `--dest`, baseUrl `--base-url`). `--dest` here has no `%original_path%` placeholder, so it is
    // unaffected by the divergence noted at the top of this file and safe to assert exactly.
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
    // PHP's original scenario — a glob `source` ("/*.xml") matching multiple local files combined
    // with a literal `dest`, expecting "The 'dest' parameter only works for single files specified
    // in the 'source' parameter" — has no equivalent check in src-next: `lib/config.ts`'s only
    // `dest`-related validation is `file.dest && !config.preserveHierarchy` (a different condition,
    // keyed on `preserve_hierarchy` rather than source arity), and per the file-level comment above,
    // that condition is unreachable through normal config-file usage — `--no-preserve-hierarchy`
    // must be passed explicitly to observe it. This test exercises that real (differently-triggered)
    // validation path instead, confirmed directly offline (no live API — config validation happens
    // before any network call): exit code 2, message "The 'dest' parameter only works for single
    // files with the specified 'preserve_hierarchy': true option".
    await switchConfig(ctx, 'crowdin-invalid');

    const result = await ctx.runner.run(['upload', 'sources', '--no-preserve-hierarchy']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain(
      "The 'dest' parameter only works for single files with the specified 'preserve_hierarchy': true option",
    );
  });
});
