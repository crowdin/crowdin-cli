import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, switchConfig, teardownSuite } from '../helpers/suite.ts';

/**
 * Covers `language list` (`cli/commands/language/LanguageCommand.ts`). Other suites run it in
 * passing; what had no coverage is the `--code` matrix and the three credential paths `--all`
 * takes: a project's languages, the account's supported languages with a token but no project, and
 * the public list with no credentials at all - the only unauthenticated call the CLI makes.
 *
 * The mapping precedence in `getCode` belongs to `language-mapping.test.ts`, which sets a project
 * mapping up; this suite reads the plain language codes the API hands back.
 *
 * `--all` returns Crowdin's whole supported-language list, which grows as Crowdin adds languages -
 * so nothing here snapshots it or asserts its length exactly.
 */
const TARGET_LANGUAGES = ['it', 'uk'];
/** A language no project in this suite targets, so it can only come from the supported list. */
const UNTARGETED_LANGUAGE = 'de';

describe('language', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    ctx = await setupSuite('language', { targetLanguageIds: TARGET_LANGUAGES });
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  async function listedCodes(args: string[] = [], runOpts = {}): Promise<string[]> {
    const result = await ctx.runner.run(['language', 'list', '--output', 'json', ...args], runOpts);

    expect(result.exitCode).toBe(0);

    return (JSON.parse(result.stdout) as { code: string }[]).map((language) => language.code).sort();
  }

  /** The codes the API itself reports for a language, the values `--code` has to reproduce. */
  async function apiCodes(languageId: string): Promise<Record<string, string>> {
    const { data } = await ctx.client.languagesApi.getLanguage(languageId);

    return {
      id: data.id,
      two_letters_code: data.twoLettersCode,
      three_letters_code: data.threeLettersCode,
      locale: data.locale,
      android_code: data.androidCode,
      osx_code: data.osxCode,
      osx_locale: data.osxLocale,
    };
  }

  test('prints help when invoked without a subcommand', async () => {
    const result = await ctx.runner.run(['language']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Manage languages');
    expect(result.stdout).toContain('list');
  });

  test('rejects an unknown subcommand', async () => {
    const result = await ctx.runner.run(['language', 'bogus']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("unknown command 'bogus'");
  });

  test('lists the target languages of the project', async () => {
    const result = await ctx.runner.run(['language', 'list']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Italian');
    expect(result.stdout).toContain('Ukrainian');
    expect(normalize(result.stdout)).toMatchSnapshot();
    expect(await listedCodes()).toEqual(TARGET_LANGUAGES);
  });

  test('lists bare codes in the plain output', async () => {
    const result = await ctx.runner.run(['language', 'list', '--output', 'plain']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim().split('\n').sort()).toEqual(TARGET_LANGUAGES);
  });

  test('carries the code and the name in the json output', async () => {
    const result = await ctx.runner.run(['language', 'list', '--output', 'json']);

    expect(result.exitCode).toBe(0);

    const languages = JSON.parse(result.stdout) as { code: string; name: string }[];

    expect(languages.map(({ code, name }) => ({ code, name })).sort((a, b) => a.code.localeCompare(b.code))).toEqual([
      { code: 'it', name: 'Italian' },
      { code: 'uk', name: 'Ukrainian' },
    ]);
  });

  test('renders every supported --code format', async () => {
    const expected = await apiCodes('uk');

    for (const format of [
      'id',
      'two_letters_code',
      'three_letters_code',
      'locale',
      'android_code',
      'osx_code',
      'osx_locale',
    ]) {
      const codes = await listedCodes(['--code', format]);

      expect(codes).toContain(expected[format] as string);
    }
  });

  test('rejects an unsupported --code value', async () => {
    const result = await ctx.runner.run(['language', 'list', '--code', 'bogus_code']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('bogus_code');
  });

  test('lists the supported languages of the account with --all', async () => {
    const codes = await listedCodes(['--all']);

    expect(codes).toContain(UNTARGETED_LANGUAGE);
    expect(codes.length).toBeGreaterThan(TARGET_LANGUAGES.length);
  });

  // From here on the config no longer carries a project id, so the ambient CROWDIN_* variables the
  // repo's .env sets have to be removed too - otherwise they refill what the config drops.
  test('lists the supported languages with a token but no project', async () => {
    await switchConfig(ctx, 'no-project');

    const codes = await listedCodes(['--all'], { env: { CROWDIN_PROJECT_ID: undefined } });

    expect(codes).toContain(UNTARGETED_LANGUAGE);
    expect(codes).toContain('uk');
  });

  test('still needs a project without --all', async () => {
    const result = await ctx.runner.run(['language', 'list'], { env: { CROWDIN_PROJECT_ID: undefined } });

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('project_id');
  });

  // The one call the CLI makes with no credentials at all: the supported-language list is public.
  // A `~/.crowdin.yml` on the machine running this would supply a token through the identity layer
  // and route the run through the authenticated branch instead - the assertions still hold, but the
  // public path would go unexercised.
  test('lists the supported languages with no credentials at all', async () => {
    await switchConfig(ctx, 'no-credentials');

    const codes = await listedCodes(['--all'], {
      env: { CROWDIN_PROJECT_ID: undefined, CROWDIN_PERSONAL_TOKEN: undefined },
    });

    expect(codes).toContain(UNTARGETED_LANGUAGE);
    expect(codes).toContain('uk');
  });

  test('applies --code to the public list as well', async () => {
    const expected = await apiCodes('uk');
    const codes = await listedCodes(['--all', '--code', 'three_letters_code'], {
      env: { CROWDIN_PROJECT_ID: undefined, CROWDIN_PERSONAL_TOKEN: undefined },
    });

    expect(codes).toContain(expected.three_letters_code as string);
  });
});
