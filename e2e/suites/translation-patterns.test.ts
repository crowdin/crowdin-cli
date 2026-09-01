import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { captureAndClear, expectRestored } from '../helpers/files.ts';
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
 * `%original_path%` resolves to the source file's parent directory, matching Java's
 * `PlaceholderUtil.fileParent` (`getValueForExportPattern`'s `originalPath` branch returns
 * `parsed.dir`, `src-next/lib/config/translationPathResolver.ts`). It once resolved to the full
 * source path *including* the filename, which made this suite's two `%original_path%` groups
 * (`android_code`, `two_letters_code_with_original_path`) resolve to doubled-filename paths that
 * matched nothing on disk, so their translations were excluded from the path assertions below.
 * They are asserted like every other group now.
 */

// The local translation path each of the ten file groups resolves to, for both target languages.
const TRANSLATION_PATHS = [
  'android_code/uk-rUA/android.xml',
  'android_code/zh-rCN/android.xml',
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
  'two_letters_code_with_original_path/two_letters_code_with_original_path-uk/android.xml',
  'two_letters_code_with_original_path/two_letters_code_with_original_path-zh/android.xml',
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

    for (const path of TRANSLATION_PATHS) {
      expect(result.stdout).toContain(`File '${path}' would be queued for translations import`);
    }

    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads translations across every placeholder-pattern file group', async () => {
    const result = await ctx.runner.run(['upload', 'translations']);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);

    for (const path of TRANSLATION_PATHS) {
      expect(result.stdout).toContain(`File '${path}'`);
    }

    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('previews the translation download across every placeholder-pattern file group', async () => {
    const result = await ctx.runner.run(['download', 'translations', '--dryrun']);

    expect(result.exitCode).toBe(0);

    for (const path of TRANSLATION_PATHS) {
      expect(result.stdout).toContain(path);
    }

    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations across every placeholder-pattern file group', async () => {
    // Each of these paths is where an upload fixture already sits; clear them so the existence check
    // below cannot pass on a stale file.
    const captured = await captureAndClear(ctx.workspace, ...TRANSLATION_PATHS);

    const result = await ctx.runner.run(['download', 'translations']);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);

    for (const path of TRANSLATION_PATHS) {
      expect(result.stdout).toContain(`File '${path}' extracted`);
    }

    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectRestored(ctx.workspace, captured);
  });

  test('lists configured translation files across every placeholder-pattern file group', async () => {
    const result = await ctx.runner.run(['config', 'translations']);

    expect(result.exitCode).toBe(0);

    for (const path of TRANSLATION_PATHS) {
      expect(result.stdout).toContain(path);
    }

    expect(normalize(result.stdout)).toMatchSnapshot();
  });
});
