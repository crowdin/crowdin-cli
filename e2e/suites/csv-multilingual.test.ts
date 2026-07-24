import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { copyFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { expectFilesExist } from '../helpers/files.ts';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * Ported from `crowdin-backend/tests/Cli/Common/CliCsvMultilingualTest.php`. That format has no
 * per-language translation files: source and translation both point at the same local CSV (the
 * `scheme` columns `it`/`uk` carry every language's translation in one file), so `upload sources`
 * (with `import_translations: true`) and `upload translations` both read/write the identical local
 * path - `sources/test files/<name>.csv`.
 *
 * PHP's `setUpBeforeClass` also called `apiV2()->setIgnorableSpecialProjectQaCheck(['size' => true])`
 * to silence the "size" QA check (several fixture rows exceed their configured `max_length`). Skipped
 * here: `@crowdin/crowdin-api-client`'s public equivalent is `qaChecksIgnorableCategories` on
 * add/editProject, but the QA check is purely advisory - it doesn't block the import, and the fixture's
 * own `expected/*.csv` files show the over-length translations landing successfully regardless. Not
 * load-bearing for anything this suite asserts.
 */
describe('csv multilingual', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    ctx = await setupSuite('csv-multilingual', { targetLanguageIds: ['it', 'uk'] });
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('updates the multilingual CSV sources', async () => {
    // Simulates editing before the first upload: overwrite the fixture sources with the rev2
    // versions (rev2 changes file 1's first string and adds a 10th row; file 2 is untouched).
    await copyFile(
      join(ctx.workspace, 'sources_rev2', 'test files', '1_multilingual.csv'),
      join(ctx.workspace, 'sources', 'test files', '1_multilingual.csv'),
    );
    await copyFile(
      join(ctx.workspace, 'sources_rev2', 'test files', '2_multilingual.csv'),
      join(ctx.workspace, 'sources', 'test files', '2_multilingual.csv'),
    );

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);
    // First-ever source upload for this suite, so both nested directories get created.
    expect(result.stdout).toContain('Directory sources created');
    expect(result.stdout).toContain('Directory test files created');
    expect(result.stdout).toContain("File 'sources/test files/1_multilingual.csv'");
    expect(result.stdout).toContain("File 'sources/test files/2_multilingual.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  // Known-bug interaction (2026-07-21) - left red intentionally as a regression marker, matching the
  // auto-update.test.ts precedent; do not "fix" the assertions to match the current buggy behavior.
  // This config's `translation:` pattern ("sources/test files/%original_file_name%") has no leading
  // slash and no language placeholder, so `patterns.scheme` + no-placeholder makes
  // UploadTranslationsCommand.buildTranslationEntries take the "multilingual" branch
  // (apps/crowdin-cli/src-next/cli/commands/upload/UploadTranslationsCommand.ts:237-247), which does
  // `translationPathResolver.resolve(...).slice(1)` unconditionally (line 240) assuming the resolved
  // path always starts with '/'. Confirmed via TranslationPathResolver.resolveWithConfig (lib/config/
  // translationPathResolver.ts) that the resolved path here is exactly "sources/test files/
  // 1_multilingual.csv" (no leading slash - the source pattern has no "**", so replaceDoubleAsterisk
  // is a no-op), so `.slice(1)` chops the real leading "s", producing "ources/test files/
  // 1_multilingual.csv". That path never exists locally, so every entry silently warns
  // ("File ources/test files/<n>_multilingual.csv does not exist in the specified location") instead
  // of importing - the same root cause as the documented "upload translations corrupts every path
  // when translation: lacks a leading slash" bug, just reached through the multilingual-scheme branch
  // instead of the per-language one. exitCode stays 0 because a per-file warning never sets hasErrors.
  test('uploads translations for every target language', async () => {
    const result = await ctx.runner.run(['upload', 'translations']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Importing translations for file 'sources/test files/1_multilingual.csv'");
    expect(result.stdout).toContain("Importing translations for file 'sources/test files/2_multilingual.csv'");
    expect(result.stdout).toContain("File 'sources/test files/1_multilingual.csv'");
    expect(result.stdout).toContain("File 'sources/test files/2_multilingual.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  // Same known-bug interaction as the previous test (the `-l` filter doesn't change which branch
  // buildTranslationEntries takes) - left red for the same reason.
  test('uploads translations for a single language (-l uk)', async () => {
    const result = await ctx.runner.run(['upload', 'translations', '-l', 'uk']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Importing translations for file 'sources/test files/1_multilingual.csv'");
    expect(result.stdout).toContain("Importing translations for file 'sources/test files/2_multilingual.csv'");
    expect(result.stdout).toContain("File 'sources/test files/1_multilingual.csv'");
    expect(result.stdout).toContain("File 'sources/test files/2_multilingual.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  // NOTE: content correctness here does NOT prove the previous two tests' "upload translations" step
  // actually worked - this config's `import_translations: true` already imports the it/uk columns
  // embedded in the CSV as part of `upload sources` (the very first test above), independent of the
  // separate `upload translations` step. So this test can pass even while "upload translations" is
  // completely broken by the bug flagged above - exactly the trap the porting notes warn about
  // ("don't trust a green download test to prove an earlier upload step worked"). The dedicated
  // `toContain` assertions on the previous two tests are what actually catches the regression.
  test('downloads translations for a single language (-l uk)', async () => {
    const result = await ctx.runner.run(['download', 'translations', '-l', 'uk']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('File sources/test files/1_multilingual.csv extracted');
    expect(result.stdout).toContain('File sources/test files/2_multilingual.csv extracted');
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesExist(
      ctx.workspace,
      'sources/test files/1_multilingual.csv',
      'sources/test files/2_multilingual.csv',
    );

    expect(await Bun.file(join(ctx.workspace, 'sources', 'test files', '1_multilingual.csv')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected', 'uk', 'test files', '1_multilingual.csv')).text(),
    );
    expect(await Bun.file(join(ctx.workspace, 'sources', 'test files', '2_multilingual.csv')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected', 'uk', 'test files', '2_multilingual.csv')).text(),
    );
  });

  test('downloads translations for every target language', async () => {
    const result = await ctx.runner.run(['download', 'translations']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('File sources/test files/1_multilingual.csv extracted');
    expect(result.stdout).toContain('File sources/test files/2_multilingual.csv extracted');
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesExist(
      ctx.workspace,
      'sources/test files/1_multilingual.csv',
      'sources/test files/2_multilingual.csv',
    );

    expect(await Bun.file(join(ctx.workspace, 'sources', 'test files', '1_multilingual.csv')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected', 'test files', '1_multilingual.csv')).text(),
    );
    expect(await Bun.file(join(ctx.workspace, 'sources', 'test files', '2_multilingual.csv')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected', 'test files', '2_multilingual.csv')).text(),
    );
  });

  test('uploads sources to a brand-new branch', async () => {
    const result = await ctx.runner.run(['upload', 'sources', '-b', 'test-branch']);

    expect(result.exitCode).toBe(0);
    // A fresh branch has its own directory tree, so both segments get created again.
    expect(result.stdout).toContain('Directory sources created');
    expect(result.stdout).toContain('Directory test files created');
    expect(result.stdout).toContain("File 'sources/test files/1_multilingual.csv'");
    expect(result.stdout).toContain("File 'sources/test files/2_multilingual.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  // Known Bug 4 (crowdin-cli-known-bugs memory) - left red intentionally as a regression marker, do
  // not "fix" the assertions to match the current buggy behavior. `FileService.loadProjectFiles`
  // returns branch files with `file.data.path` prefixed by the branch name (e.g.
  // "test-branch/sources/test files/1_multilingual.csv"), but UploadSourcesCommand's existing-file
  // lookup key (`resolveProjectPath`/`toProjectPath`) never adds that prefix, so the lookup always
  // misses on a *second* upload to an already-existing branch. The server then rejects the resulting
  // duplicate create with "Project already contains the file '<path>'". First upload to a brand-new
  // branch (previous test) always looks fine because the existing-file map starts empty, which is
  // exactly why the bug only shows up from the second upload onward.
  test('updates sources on the existing branch (branch already exists)', async () => {
    const result = await ctx.runner.run(['upload', 'sources', '-b', 'test-branch']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'sources/test files/1_multilingual.csv'");
    expect(result.stdout).toContain("File 'sources/test files/2_multilingual.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  // Same Known Bug 4 root cause, from the translation side: UploadTranslationsCommand resolves the
  // source file's project path the same branch-agnostic way to look up its `fileId`
  // (resolveFileId in UploadTranslationsCommand.ts), so it can't find the branch-scoped file either
  // and errors "Source file '<path>' does not exist in the project" (hasErrors=true, so unlike the
  // multilingual-scheme bug above, this one DOES flip the exit code). Left red for the same reason.
  test('uploads translations on the branch', async () => {
    const result = await ctx.runner.run(['upload', 'translations', '-b', 'test-branch']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Importing translations for file 'sources/test files/1_multilingual.csv'");
    expect(result.stdout).toContain("Importing translations for file 'sources/test files/2_multilingual.csv'");
    expect(result.stdout).toContain("File 'sources/test files/1_multilingual.csv'");
    expect(result.stdout).toContain("File 'sources/test files/2_multilingual.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  // Same "a green download doesn't prove the upload step worked" caveat as above: the branch's files
  // already got their it/uk columns imported when they were first created (the branch-upload-sources
  // test, via `import_translations: true`), so this can pass even though the two tests above are
  // expected to be red.
  test('downloads translations for the branch', async () => {
    await rm(join(ctx.workspace, 'sources', 'test files'), { recursive: true, force: true });

    const result = await ctx.runner.run(['download', 'translations', '-b', 'test-branch']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('File sources/test files/1_multilingual.csv extracted');
    expect(result.stdout).toContain('File sources/test files/2_multilingual.csv extracted');
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesExist(
      ctx.workspace,
      'sources/test files/1_multilingual.csv',
      'sources/test files/2_multilingual.csv',
    );

    expect(await Bun.file(join(ctx.workspace, 'sources', 'test files', '1_multilingual.csv')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected', 'test files', '1_multilingual.csv')).text(),
    );
    expect(await Bun.file(join(ctx.workspace, 'sources', 'test files', '2_multilingual.csv')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected', 'test files', '2_multilingual.csv')).text(),
    );
  });
});
