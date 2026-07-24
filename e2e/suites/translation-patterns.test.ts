import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { expectFilesExist } from '../helpers/files.ts';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * Port of crowdin-backend's `tests/Cli/Common/CliTranslationPatternsTest.php`: ten file groups,
 * one per `translation:` placeholder token (`%android_code%`, `%language%`, `%locale%`,
 * `%locale_with_underscore%`, `%osx_code%`, `%osx_locale%`, `%three_letters_code%`,
 * `%two_letters_code%`, plus two groups combining `%original_path%` with a language token and
 * with `%android_code%`), exercised through upload sources -> dryrun/real upload translations ->
 * dryrun/real download translations -> `config translations` listing, against target languages
 * `uk` and `zh-CN` (matching the PHP fixture's `%android_code%`/`%three_letters_code%`/etc. values,
 * which come straight from the server's Language object and are identical for the TS CLI).
 *
 * One behavior confirmed via code trace (see `crowdin-cli-known-bugs.md` Bug 7, first found while
 * porting `CliDestTest` -> `dest.test.ts`) diverges from PHP/Java here too:
 *
 * `%original_path%` resolves to the FULL relative source path (directory + file name), not just
 * the containing directory as Java's CLI does (`lib/config/translationPathResolver.ts`'s
 * `getValueForExportPattern`, `case originalPath: return filePath` - `filePath` is the whole
 * source path). This hits two of this suite's ten groups directly in their `translation:` pattern
 * (not just `dest:`, unlike the `dest.test.ts` occurrence):
 *   - `android_code`: `/%original_path%/%android_code%/%original_file_name%` resolves to
 *     `android_code/android.xml/<android_code>/android.xml` instead of PHP's
 *     `android_code/<android_code>/android.xml`.
 *   - `two_letters_code_with_original_path`: `/%original_path%/%original_path%-%two_letters_code%/android.xml`
 *     resolves to `two_letters_code_with_original_path/android.xml/two_letters_code_with_original_path/android.xml-<code>/android.xml`
 *     instead of PHP's `two_letters_code_with_original_path/two_letters_code_with_original_path-<code>/android.xml`.
 * Both groups still upload/download successfully (the CLI just resolves a different, wrong local
 * path), so they are exercised for real but only asserted via `toMatchSnapshot()` below - not via
 * hardcoded path assertions, per the same approach `dest.test.ts` uses for its own `%original_path%`
 * hit. The fixture still ships translation files at the PHP-intended paths (`android_code/uk-rUA/...`,
 * `two_letters_code_with_original_path/two_letters_code_with_original_path-uk/...`) for when Bug 7
 * gets fixed; until then `upload translations` reports them as "does not exist in the specified
 * location" (a warning, not a failure - exit code stays 0) because the CLI looks for them at the
 * buggy computed path instead.
 */

// The 8 of 10 file groups whose `translation:` pattern has no `%original_path%` token, so their
// resolved local path is unaffected by Bug 7 and safe to assert exactly, for both target languages.
const UNAFFECTED_TRANSLATION_PATHS = [
  'doubled_asterisk/res/values-uk/android.xml',
  'doubled_asterisk/res/values-zh/android.xml',
  'language/Ukrainian/android.xml',
  'language/Chinese Simplified/android.xml',
  'locale/uk-UA/android.xml',
  'locale/zh-CN/android.xml',
  'locale_with_underscore/uk_UA/android.xml',
  'locale_with_underscore/zh_CN/android.xml',
  'osx_code/uk.lproj/android.xml',
  'osx_code/zh-Hans.lproj/android.xml',
  'osx_locale/uk/android.xml',
  'osx_locale/zh-Hans/android.xml',
  'three_letters_code/ukr/android.xml',
  'three_letters_code/zho/android.xml',
  'two_letters_code/uk/android.xml',
  'two_letters_code/zh/android.xml',
];

describe('translation patterns', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    ctx = await setupSuite('translation-patterns', { sourceLanguageId: 'en', targetLanguageIds: ['uk', 'zh-CN'] });
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('uploads sources across every placeholder-pattern file group', async () => {
    const result = await ctx.runner.run(['upload', 'sources']);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);

    // Only `translation:` patterns reference %original_path% here - none of the `source:` patterns
    // do - so upload sources (which only resolves `source:`/`dest:`) is unaffected by Bug 7.
    for (const path of [
      'android_code/android.xml',
      'doubled_asterisk/res/values/android.xml',
      'language/android.xml',
      'locale/android.xml',
      'locale_with_underscore/android.xml',
      'osx_code/android.xml',
      'osx_locale/android.xml',
      'three_letters_code/android.xml',
      'two_letters_code/android.xml',
      'two_letters_code_with_original_path/android.xml',
    ]) {
      expect(result.stdout).toContain(`File '${path}'`);
    }

    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('previews the translation upload across every placeholder-pattern file group', async () => {
    const result = await ctx.runner.run(['upload', 'translations', '--dryrun']);

    expect(result.exitCode).toBe(0);

    for (const path of UNAFFECTED_TRANSLATION_PATHS) {
      expect(result.stdout).toContain(`File ${path} would be queued for translations import`);
    }

    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads translations across every placeholder-pattern file group', async () => {
    const result = await ctx.runner.run(['upload', 'translations']);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);

    for (const path of UNAFFECTED_TRANSLATION_PATHS) {
      expect(result.stdout).toContain(`File '${path}'`);
    }

    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('previews the translation download across every placeholder-pattern file group', async () => {
    const result = await ctx.runner.run(['download', 'translations', '--dryrun']);

    expect(result.exitCode).toBe(0);

    for (const path of UNAFFECTED_TRANSLATION_PATHS) {
      expect(result.stdout).toContain(path);
    }

    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations across every placeholder-pattern file group', async () => {
    const result = await ctx.runner.run(['download', 'translations']);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);

    for (const path of UNAFFECTED_TRANSLATION_PATHS) {
      expect(result.stdout).toContain(`File ${path} extracted`);
    }

    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesExist(ctx.workspace, ...UNAFFECTED_TRANSLATION_PATHS);
  });

  test('lists configured translation files across every placeholder-pattern file group', async () => {
    const result = await ctx.runner.run(['config', 'translations']);

    expect(result.exitCode).toBe(0);

    for (const path of UNAFFECTED_TRANSLATION_PATHS) {
      expect(result.stdout).toContain(path);
    }

    expect(normalize(result.stdout)).toMatchSnapshot();
  });
});
