import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { writeConfig } from '../helpers/config.ts';
import { expectFilesExist } from '../helpers/files.ts';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

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
    // three groups whose `dest` has no `%original_path%` placeholder (see file-level comment above
    // for why the other three groups are snapshot-only).
    expect(result.stdout).toContain("File 'android.xml'");
    expect(result.stdout).toContain('Directory Folder created');
    expect(result.stdout).toContain("File 'folder/android_en_US.xml'");
    expect(result.stdout).toContain("File 'folder/client_en_US.xml'");
    expect(result.stdout).toContain("File 'destCheckFolder/android.xml'");
    expect(result.stdout).toContain("File 'destCheckFolderParallelFileProcess/android.xml'");
    expect(result.stdout).toContain("File 'destCheckFolderParallelFileProcess/second_android.xml'");

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
    // Capture the parallel-process group's translation content before download overwrites it at
    // the same local paths (mirrors full-cli-workflow.test.ts's approach — comparing a file against
    // itself after download would trivially pass).
    const parallelProcessFiles = [
      'destCheckFolderParallelFileProcess/android_it_IT.xml',
      'destCheckFolderParallelFileProcess/android_uk_UA.xml',
      'destCheckFolderParallelFileProcess/second_android_it_IT.xml',
      'destCheckFolderParallelFileProcess/second_android_uk_UA.xml',
    ];
    const uploadedContent = new Map<string, string>();
    for (const path of parallelProcessFiles) {
      uploadedContent.set(path, await Bun.file(join(ctx.workspace, path)).text());
    }

    const result = await ctx.runner.run(['download', 'translations']);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesExist(
      ctx.workspace,
      'android_it_IT.xml',
      'android_uk_UA.xml',
      'folder/android_it_IT.xml',
      'folder/android_uk_UA.xml',
      'folder/client_it_IT.xml',
      'folder/client_uk_UA.xml',
      'destCheckFolder/android_it_IT.xml',
      'destCheckFolder/android_uk_UA.xml',
      ...parallelProcessFiles,
    );

    for (const path of parallelProcessFiles) {
      const downloaded = await Bun.file(join(ctx.workspace, path)).text();
      expect(downloaded).toBe(uploadedContent.get(path));
    }
  });

  test('uploads sources to a branch with dest remapping', async () => {
    const result = await ctx.runner.run(['upload', 'sources', '-b', 'test-branch']);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    // First upload to a brand-new branch — the existing-file lookup Map starts empty for it, so
    // Bug 4 (crowdin-cli-known-bugs.md: branch-prefixed path lookup mismatch) doesn't manifest yet
    // (it only affects an *existing* branch's update path / translation-source lookup, exercised by
    // the next two tests). Java/TS also print no branch-creation message at all — confirmed in
    // base-path.test.ts's port — so none is asserted here.
    expect(result.stdout).toContain("File 'android.xml'");
    expect(result.stdout).toContain('Directory Folder created');
    expect(result.stdout).toContain("File 'folder/android_en_US.xml'");
    expect(result.stdout).toContain("File 'folder/client_en_US.xml'");

    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  // Known-broken: Bug 4 (see crowdin-cli-known-bugs.md) — `fileService.loadProjectFiles(branchId)`
  // returns branch-prefixed paths (`test-branch/android.xml`), but the translation-side source-file
  // lookup in `UploadTranslationsCommand.buildTranslationEntries` computes a branch-agnostic project
  // path, so the lookup always misses for a branched upload and every entry fails with "Source file
  // '<path>' does not exist in the project". Written to match PHP's intended (passing) behavior and
  // left as a regression marker, per the project's established convention for this bug
  // (base-path.test.ts's equivalent test does the same) — do not weaken this assertion to match the
  // current buggy output.
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

  // Depends on the (likely broken, see above) translations upload actually having imported
  // translations into the branch build.
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
    expect(result.stdout).toContain('Directory SingleDest created');
    expect(result.stdout).toContain('Directory xml created');
    expect(result.stdout).toContain('Directory android created');
    expect(result.stdout).toContain("File 'android.xml'");

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
    const template = await Bun.file(join(ctx.workspace, 'alt-configs', 'crowdin-invalid.yml')).text();
    await writeConfig(ctx.workspace, template, { projectId: ctx.project.id, token: ctx.env.token as string });

    const result = await ctx.runner.run(['upload', 'sources', '--no-preserve-hierarchy']);

    expect(result.exitCode).toBe(2);
    expect(result.stdout).toContain(
      "The 'dest' parameter only works for single files with the specified 'preserve_hierarchy': true option",
    );
  });
});
