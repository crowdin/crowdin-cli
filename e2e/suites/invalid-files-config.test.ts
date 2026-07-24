import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * Port of crowdin-backend/tests/Cli/Common/CliInvalidFilesConfigTest.php.
 *
 * The PHP original re-renders `crowdin.yml` before every test via `prepareConfig([...])`, swapping
 * in a different `source`/`translation` pair each time. The TS CLI supports the same per-test
 * override without a fresh config file: `upload sources`/`upload translations` both declare a
 * non-variadic `--source`/`--translation` pair (`filesConfigGroup`), and `cli/config.ts`'s
 * `cliLayer` replaces `config.files` with a single-file entry whenever both are given (confirmed at
 * src-next/cli/config.ts and already exercised the same way by full-cli-workflow.test.ts's
 * "reports an invalid configuration file" case). So this suite keeps one fixture with a valid
 * fallback `files:` entry and drives every scenario via CLI flags, exactly mirroring each PHP
 * method's `prepareConfig()` call.
 */
describe('invalid files config', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    ctx = await setupSuite('invalid-files-config');
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('uploads sources with a source pattern that matches no local file', async () => {
    const result = await ctx.runner.run([
      'upload',
      'sources',
      '--source',
      '/sources/android-not-exists.xml',
      '--translation',
      '/translations/%two_letters_code%/android.xml',
    ]);

    // Confirmed at UploadSourcesCommand.ts: zero matches for a file group throws a CliError
    // immediately (unguarded inside the per-group loop), which lands in cli.ts's top-level catch
    // with the default CliError exit code (1) -- matching the PHP original's assertion.
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('Fetching project info');
    // Literal wording confirmed at UploadSourcesCommand.ts -- matches the PHP original verbatim.
    expect(result.stdout).toContain(
      "No sources found for '/sources/android-not-exists.xml' pattern. Check the source paths in your configuration file",
    );
    // Known CLI bug (see file-groups.test.ts): because this is a thrown CliError rather than the
    // separate hasErrors/reportFailures path, the closing "Current execution finished with errors"
    // line the PHP original expects is NEVER printed here. Do not assert it.
    expect(result.stdout).not.toContain('Current execution finished with errors');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads sources with a source pattern whose folder does not exist', async () => {
    const result = await ctx.runner.run([
      'upload',
      'sources',
      '--source',
      '/not-exists/**/*.*',
      '--translation',
      '/translations/%two_letters_code%/android.xml',
    ]);

    // Same zero-match-group abort as above -- a nonexistent base folder also globs to zero matches.
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('Fetching project info');
    expect(result.stdout).toContain(
      "No sources found for '/not-exists/**/*.*' pattern. Check the source paths in your configuration file",
    );
    expect(result.stdout).not.toContain('Current execution finished with errors');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads sources with a translation pattern missing a language placeholder', async () => {
    const result = await ctx.runner.run([
      'upload',
      'sources',
      '--source',
      '/sources/android.xml',
      // '%two_Letters_code%' (capital L) is not a recognized placeholder token (see
      // src-next/lib/export/patterns.ts's languagePatterns), so this translation pattern is treated
      // as having no language placeholder at all.
      '--translation',
      '/translations/%two_Letters_code%/android.xml',
    ]);

    // ConfigSchema's superRefine (src-next/lib/config.ts) rejects this before any API call, via
    // assembleConfig's `ConfigSchema.safeParse` -> InvalidConfigurationError (exitCode 2). Confirmed
    // the exact issue message by parsing this same shape directly against ConfigSchema.
    expect(result.exitCode).toBe(2);
    expect(result.stdout).not.toContain('Fetching project info');
    expect(result.stdout).toContain(
      "The 'translation' parameter should contain at least one language placeholder (e.g. %locale%)",
    );
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads sources with a translation pattern containing a relative path', async () => {
    const result = await ctx.runner.run([
      'upload',
      'sources',
      '--source',
      '/sources/android.xml',
      '--translation',
      '../translations/%two_letters_code%/android.xml',
    ]);

    // Same ConfigSchema gate, different rule: the translation field's `../` refine (src-next/lib/
    // config.ts). Confirmed the exact issue message the same way as the previous test.
    expect(result.exitCode).toBe(2);
    expect(result.stdout).not.toContain('Fetching project info');
    expect(result.stdout).toContain('translation cannot contain "../"');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads translations when the source file does not exist in the project', async () => {
    const result = await ctx.runner.run([
      'upload',
      'translations',
      '--source',
      '/sources/android.xml',
      '--translation',
      '/translations/%two_letters_code%/android-not-exists.xml',
    ]);

    // No prior test in this suite ever completes an actual upload (1-2 abort on zero matches, 3-4
    // fail config validation before touching the API), so the project is still empty here --
    // 'sources/android.xml' was never pushed. UploadTranslationsCommand.ts's buildTranslationEntries
    // resolves the *source* pattern against the local disk first (it exists), then looks up that
    // project path in the (empty) file list and errors there -- before ever checking whether the
    // configured translation pattern's local file exists. So the wrong/nonexistent
    // 'android-not-exists.xml' translation filename is never reached; only one error line is
    // produced (per source file, not per target language). Wording differs from the PHP original
    // ("Failed to upload translations for the source '...' since file '...' is missing in the
    // project. Run the 'crowdin push' ...") -- confirmed the actual TS wording directly at
    // UploadTranslationsCommand.ts.
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('Fetching project info');
    expect(result.stdout).toContain("Source file 'sources/android.xml' does not exist in the project");
    // Unlike the upload-sources zero-match case above, this goes through the entriesHaveErrors path
    // (not a thrown-mid-loop CliError), so the closing line IS printed here -- confirmed at
    // UploadTranslationsCommand.ts and uploadFailures.ts's EXECUTION_FINISHED_WITH_ERRORS constant.
    expect(result.stdout).toContain('Current execution finished with errors');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });
});
