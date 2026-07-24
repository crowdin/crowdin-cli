import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { writeConfig } from '../helpers/config.ts';
import { expectFilesExist } from '../helpers/files.ts';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * Ported from `crowdin-backend/tests/Cli/Common/CliTranslationsNotMatchTest.php` (12 `@depends`-chained
 * test methods, all ported 1:1 below - the task brief's "14" was an overcount).
 *
 * The suite's actual "not match" scenario: `sources/java.properties` is added straight through the
 * API (`uploadStorageApi.addStorage` + `sourceFilesApi.createFile`), bypassing the CLI/config
 * entirely, so it never gets a per-file `exportPattern` of its own. `sources/*.xml` (1/2/3_android.xml)
 * ARE uploaded through the CLI with `translation: /translations/%two_letters_code%/%original_file_name%`,
 * which Crowdin stores as each file's `exportPattern`. Translation *content* is never uploaded for any
 * of these (the translation upload tests below always warn the local files don't exist), so every
 * download relies purely on the project's untranslated-source fallback.
 *
 * The mismatch is then manufactured by narrowing the config's `source:` pattern from `/sources/*.xml`
 * to just `/sources/1_android.xml` before every download test. The build archive still contains every
 * project source's per-language export (2_android.xml, 3_android.xml, java.properties x it/uk), but the
 * narrowed config can only map 1_android.xml locally - so the rest come back "omitted", grouped by
 * source, exactly the `DownloadCommand.reportOmittedFiles` path this suite exists to exercise.
 *
 * Wording verified directly against source (not assumed from the PHP original, which uses different
 * strings throughout):
 * - `UploadTranslationsCommand.ts`: missing local translation file -> `File <path> does not exist in
 *   the specified location` (PHP: "translation file doesn't exist in the specified place").
 * - `DownloadCommand.ts` (`reportOmittedFiles`): `Downloaded translations don't match the current
 *   project configuration. The translations for the following sources will be omitted (use --verbose
 *   to get the list of the omitted translations):`, then one `\t- <source> (<count>)` line per source,
 *   each followed by `\t\t- <translation path>` sub-lines only with `--verbose`, then a bare
 *   `Visit the https://crowdin.github.io/crowdin-cli/faq for more details` line - this part matches the
 *   PHP wording closely, but is taken from `src-next/cli/commands/download/DownloadCommand.ts` directly,
 *   not assumed.
 * - Branch upload prints no branch-creation message and uses unprefixed local paths (`Directory sources
 *   created`, `File 'sources/1_android.xml'`) - confirmed via `UploadSourcesCommand.ts`
 *   (`BranchService.getOrCreateBranch` is silent), matching this porting effort's established
 *   branch-upload wording note (see `file-tree.test.ts`). PHP's "Branch 'test-branch'" /
 *   "test-branch/sources/..." messages do NOT apply here.
 * - The branch-scoped download omits only `sources/2_android.xml` and `sources/3_android.xml`, never
 *   `java.properties` - `java.properties` was created at the project root (no branch), so a
 *   branch-scoped build never includes it and `fileService.loadProjectFiles(branchId)` never lists it
 *   either. This matches the PHP original's own branch-download assertions (no `java.properties` line).
 * - Confirmed via a live run: for a file with no custom `exportPattern` (`java.properties`), the
 *   server-side archive path depends on how many languages the build targets. Building for ALL
 *   languages at once needs the `<languageId>/<name>` fallback to disambiguate (`it/java.properties`,
 *   `uk/java.properties`), but a single-language build (`-l uk`) has nothing to disambiguate, so the
 *   archive entry is the bare `java.properties` with no language prefix. `sources/*.xml` don't show
 *   this because their explicit `exportPattern` always resolves the same way regardless of language
 *   count.
 */

/** Overwrites the workspace's `crowdin.yml` with one of the `alt-configs/<name>.yml` templates. */
async function switchConfig(ctx: SuiteContext, name: string): Promise<void> {
  const template = await Bun.file(join(ctx.workspace, 'alt-configs', `${name}.yml`)).text();
  await writeConfig(ctx.workspace, template, { projectId: ctx.project.id, token: ctx.env.token as string });
}

describe('translations not match', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    ctx = await setupSuite('translations-not-match');
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('uploads sources, alongside a directly-uploaded file the config never covers', async () => {
    // Mirrors the PHP original's raw `apiV2()->uploadFile()` call: a source file added straight
    // through the API, bypassing the CLI/config entirely. It gets no per-file `exportPattern`, so no
    // later config can ever map it locally - it's the permanent "extra" source the whole suite's
    // mismatch scenario needs.
    const content = new Uint8Array(await Bun.file(join(ctx.workspace, 'sources/java.properties')).arrayBuffer());
    const storage = await ctx.client.uploadStorageApi.addStorage('java.properties', content);
    await ctx.client.sourceFilesApi.createFile(ctx.project.id, { storageId: storage.data.id, name: 'java.properties' });

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Directory sources created');
    expect(result.stdout).toContain("File 'sources/1_android.xml'");
    expect(result.stdout).toContain("File 'sources/2_android.xml'");
    expect(result.stdout).toContain("File 'sources/3_android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('attempts to upload translations for all languages (none exist locally)', async () => {
    const result = await ctx.runner.run(['upload', 'translations']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('File translations/it/1_android.xml does not exist in the specified location');
    expect(result.stdout).toContain('File translations/it/2_android.xml does not exist in the specified location');
    expect(result.stdout).toContain('File translations/it/3_android.xml does not exist in the specified location');
    expect(result.stdout).toContain('File translations/uk/1_android.xml does not exist in the specified location');
    expect(result.stdout).toContain('File translations/uk/2_android.xml does not exist in the specified location');
    expect(result.stdout).toContain('File translations/uk/3_android.xml does not exist in the specified location');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('attempts to upload translations for a single specified language (uk)', async () => {
    const result = await ctx.runner.run(['upload', 'translations', '-l', 'uk']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('File translations/uk/1_android.xml does not exist in the specified location');
    expect(result.stdout).toContain('File translations/uk/2_android.xml does not exist in the specified location');
    expect(result.stdout).toContain('File translations/uk/3_android.xml does not exist in the specified location');
    expect(result.stdout).not.toContain('translations/it/');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('previews downloading translations once the config narrows to a single source file (dry run)', async () => {
    await switchConfig(ctx, 'single-file');

    const result = await ctx.runner.run(['download', 'translations', '--dryrun']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('translations/it/1_android.xml');
    expect(result.stdout).toContain('translations/uk/1_android.xml');
    expect(result.stdout).not.toContain('2_android.xml');
    expect(result.stdout).not.toContain('3_android.xml');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('previews the same narrowed dry run as a tree', async () => {
    const result = await ctx.runner.run(['download', 'translations', '--dryrun', '--tree']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations for real, warning about the sources the narrowed config no longer covers', async () => {
    const result = await ctx.runner.run(['download', 'translations']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(
      "Downloaded translations don't match the current project configuration. The translations for the " +
        'following sources will be omitted (use --verbose to get the list of the omitted translations):',
    );
    expect(result.stdout).toContain('sources/2_android.xml (2)');
    expect(result.stdout).toContain('sources/3_android.xml (2)');
    expect(result.stdout).toContain('java.properties (2)');
    expect(result.stdout).toContain('Visit the https://crowdin.github.io/crowdin-cli/faq for more details');
    // --verbose is not set here, so the omitted archive paths themselves must NOT be listed.
    expect(result.stdout).not.toContain('translations/it/2_android.xml');
    expect(result.stdout).not.toContain('translations/it/3_android.xml');
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesExist(ctx.workspace, 'translations/it/1_android.xml', 'translations/uk/1_android.xml');
    expect(await Bun.file(join(ctx.workspace, 'translations/it/1_android.xml')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/it/1_android.xml')).text(),
    );
    expect(await Bun.file(join(ctx.workspace, 'translations/uk/1_android.xml')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/uk/1_android.xml')).text(),
    );
  });

  test('downloads translations again with --verbose, listing the omitted translation paths', async () => {
    const result = await ctx.runner.run(['download', 'translations', '--verbose']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('sources/2_android.xml (2)');
    expect(result.stdout).toContain('sources/3_android.xml (2)');
    expect(result.stdout).toContain('java.properties (2)');
    // --verbose additionally lists the concrete omitted archive paths under each source. The XML
    // sources carry the `translations/%two_letters_code%/%original_file_name%` exportPattern set at
    // upload time; `java.properties` (no exportPattern of its own) falls back to a bare
    // `<languageId>/<name>` path.
    expect(result.stdout).toContain('translations/it/2_android.xml');
    expect(result.stdout).toContain('translations/uk/2_android.xml');
    expect(result.stdout).toContain('translations/it/3_android.xml');
    expect(result.stdout).toContain('translations/uk/3_android.xml');
    expect(result.stdout).toContain('it/java.properties');
    expect(result.stdout).toContain('uk/java.properties');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations for a single specified language (uk)', async () => {
    await rm(join(ctx.workspace, 'translations'), { recursive: true, force: true });

    const result = await ctx.runner.run(['download', 'translations', '-l', 'uk']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('sources/2_android.xml (1)');
    expect(result.stdout).toContain('sources/3_android.xml (1)');
    expect(result.stdout).toContain('java.properties (1)');
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesExist(ctx.workspace, 'translations/uk/1_android.xml');
    expect(await Bun.file(join(ctx.workspace, 'translations/uk/1_android.xml')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/uk/1_android.xml')).text(),
    );
  });

  test('downloads translations for a single specified language (uk) with --verbose', async () => {
    await rm(join(ctx.workspace, 'translations'), { recursive: true, force: true });

    const result = await ctx.runner.run(['download', 'translations', '-l', 'uk', '--verbose']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('sources/2_android.xml (1)');
    expect(result.stdout).toContain('sources/3_android.xml (1)');
    expect(result.stdout).toContain('java.properties (1)');
    expect(result.stdout).toContain('translations/uk/2_android.xml');
    expect(result.stdout).toContain('translations/uk/3_android.xml');
    // Unlike the all-languages --verbose run above, a single-language build has no ambiguity to
    // resolve for a file with no custom exportPattern: the server's archive entry for
    // `java.properties` is the bare name, with no `%two_letters_code%`-style prefix.
    expect(result.stdout).toContain('\t\t- java.properties');
    expect(result.stdout).not.toContain('uk/java.properties');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads sources to a brand-new branch', async () => {
    await switchConfig(ctx, 'multi-file');

    const result = await ctx.runner.run(['upload', 'sources', '-b', 'test-branch']);

    expect(result.exitCode).toBe(0);
    // `upload sources -b <branch>` creates/reuses the branch silently (`getOrCreateBranch`) and its
    // success messages use the LOCAL path with no branch prefix - confirmed via `UploadSourcesCommand.ts`,
    // matching this porting effort's established branch-upload wording note. PHP's "Branch 'x'" /
    // "test-branch/sources/..." wording does not apply to the TS CLI.
    expect(result.stdout).toContain('Directory sources created');
    expect(result.stdout).toContain("File 'sources/1_android.xml'");
    expect(result.stdout).toContain("File 'sources/2_android.xml'");
    expect(result.stdout).toContain("File 'sources/3_android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations for the branch, with the same configuration mismatch', async () => {
    await rm(join(ctx.workspace, 'translations'), { recursive: true, force: true });
    await switchConfig(ctx, 'single-file');

    const result = await ctx.runner.run(['download', 'translations', '-b', 'test-branch']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('sources/2_android.xml (2)');
    expect(result.stdout).toContain('sources/3_android.xml (2)');
    // `java.properties` lives outside any branch, so a branch-scoped build never includes it - it
    // cannot show up in this report the way it does for the non-branch download above.
    expect(result.stdout).not.toContain('java.properties');
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesExist(ctx.workspace, 'translations/it/1_android.xml', 'translations/uk/1_android.xml');
    expect(await Bun.file(join(ctx.workspace, 'translations/it/1_android.xml')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/it/1_android.xml')).text(),
    );
    expect(await Bun.file(join(ctx.workspace, 'translations/uk/1_android.xml')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/uk/1_android.xml')).text(),
    );
  });

  test('downloads translations for the branch with --verbose', async () => {
    const result = await ctx.runner.run(['download', 'translations', '-b', 'test-branch', '--verbose']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('sources/2_android.xml (2)');
    expect(result.stdout).toContain('sources/3_android.xml (2)');
    expect(result.stdout).not.toContain('java.properties');
    expect(result.stdout).toContain('translations/it/2_android.xml');
    expect(result.stdout).toContain('translations/uk/2_android.xml');
    expect(result.stdout).toContain('translations/it/3_android.xml');
    expect(result.stdout).toContain('translations/uk/3_android.xml');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });
});
