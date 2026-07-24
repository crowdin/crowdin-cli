import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import type { ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import { writeConfig } from '../helpers/config.ts';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * Ported from `crowdin-backend/tests/Cli/Common/CliLanguageMappingTest.php`. Each of the 8 file
 * groups below exercises one language placeholder (`%android_code%`, `%language%`, `%locale%`,
 * `%locale_with_underscore%`, `%osx_code%`, `%osx_locale%`, `%three_letters_code%`,
 * `%two_letters_code%`) with a per-file `languages_mapping` override for `uk`/`zh-CN`, mirroring
 * `TranslationPathResolver`/`languagePlaceholders.ts` (`apps/crowdin-cli/src-next/lib/export/
 * languagePlaceholders.ts`), which resolves local `languages_mapping` before falling back to the
 * server-side project language mapping, in turn falling back to the language's default code.
 *
 * The second half switches to `alt-configs/crowdin-no-mapping.yml` (same 8 groups, no local
 * `languages_mapping`) after setting the project's server-side language mapping via
 * `editProject`/`languageMapping` - the CLI's equivalent of the PHP test's
 * `languageMapping()->saveLanguage()`. That mapping mirrors every local override except
 * `android_code`, which is deliberately set to a different value (`*_crwd`) to prove the server
 * mapping - not a stale local one - is what takes effect once the local override is removed.
 */

const UK_LANGUAGE_MAPPING: ProjectsGroupsModel.LanguageMappingEntity = {
  name: 'Ukrainian_',
  android_code: 'uk-rUA_crwd',
  two_letters_code: 'uk_',
  three_letters_code: 'ukr_',
  locale: 'uk-UA_',
  locale_with_underscore: 'uk_UA_',
  osx_code: 'uk.lproj_',
  osx_locale: 'uk_',
};

const ZH_CN_LANGUAGE_MAPPING: ProjectsGroupsModel.LanguageMappingEntity = {
  name: 'Chinese Simplified_',
  android_code: 'zh-rCN_crwd',
  two_letters_code: 'zh_',
  three_letters_code: 'zho_',
  locale: 'zh-CN_',
  locale_with_underscore: 'zh_CN_',
  osx_code: 'zh-Hans.lproj_',
  osx_locale: 'zh-Hans_',
};

/**
 * Overwrites the workspace's `crowdin.yml` with `alt-configs/crowdin-no-mapping.yml` - the same 8
 * file groups, minus every per-file `languages_mapping` override - so later commands fall back to
 * the server-side project language mapping. Mirrors the `switchConfig` helper used by
 * `excluded-languages.test.ts`.
 */
async function switchToNoLocalMapping(ctx: SuiteContext): Promise<void> {
  const template = await Bun.file(join(ctx.workspace, 'alt-configs', 'crowdin-no-mapping.yml')).text();
  await writeConfig(ctx.workspace, template, { projectId: ctx.project.id, token: ctx.env.token as string });
}

describe('language mapping', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    ctx = await setupSuite('language-mapping', { targetLanguageIds: ['uk', 'zh-CN'] });
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('uploads sources for every language-mapping placeholder', async () => {
    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);
    for (const group of [
      'android_code',
      'language',
      'locale',
      'locale_with_underscore',
      'osx_code',
      'osx_locale',
      'three_letters_code',
      'two_letters_code',
    ]) {
      expect(result.stdout).toContain(`Directory ${group} created`);
      expect(result.stdout).toContain(`File '${group}/android.xml'`);
    }
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('previews the translation upload with the default language mapping', async () => {
    const result = await ctx.runner.run(['upload', 'translations', '--dryrun']);

    expect(result.exitCode).toBe(0);
    for (const path of [
      'android_code/uk-rUA_/android.xml',
      'android_code/zh-rCN_/android.xml',
      'language/Ukrainian_/android.xml',
      'language/Chinese Simplified_/android.xml',
      'locale/uk-UA_/android.xml',
      'locale/zh-CN_/android.xml',
      'locale_with_underscore/uk_UA_/android.xml',
      'locale_with_underscore/zh_CN_/android.xml',
      'osx_code/uk.lproj_/android.xml',
      'osx_code/zh-Hans.lproj_/android.xml',
      'osx_locale/uk_/android.xml',
      'osx_locale/zh-Hans_/android.xml',
      'three_letters_code/ukr_/android.xml',
      'three_letters_code/zho_/android.xml',
      'two_letters_code/uk_/android.xml',
      'two_letters_code/zh_/android.xml',
    ]) {
      expect(result.stdout).toContain(`File ${path} would be queued for translations import`);
    }
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads translations with the default language mapping', async () => {
    const result = await ctx.runner.run(['upload', 'translations']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Importing translations for file 'android_code/uk-rUA_/android.xml'");
    expect(result.stdout).toContain("File 'android_code/uk-rUA_/android.xml'");
    expect(result.stdout).toContain("File 'locale/zh-CN_/android.xml'");
    expect(result.stdout).toContain("File 'osx_locale/uk_/android.xml'");
    expect(result.stdout).toContain("File 'two_letters_code/zh_/android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('previews the translation download with the default language mapping', async () => {
    const result = await ctx.runner.run(['download', 'translations', '--dryrun']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('android_code/uk-rUA_/android.xml');
    expect(result.stdout).toContain('locale/zh-CN_/android.xml');
    expect(result.stdout).toContain('three_letters_code/ukr_/android.xml');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations with the default language mapping', async () => {
    const result = await ctx.runner.run(['download', 'translations']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('File android_code/uk-rUA_/android.xml extracted');
    expect(result.stdout).toContain('File language/Chinese Simplified_/android.xml extracted');
    expect(normalize(result.stdout)).toMatchSnapshot();

    await Promise.all(
      [
        'android_code/uk-rUA_/android.xml',
        'android_code/zh-rCN_/android.xml',
        'language/Ukrainian_/android.xml',
        'language/Chinese Simplified_/android.xml',
        'locale/uk-UA_/android.xml',
        'locale/zh-CN_/android.xml',
        'locale_with_underscore/uk_UA_/android.xml',
        'locale_with_underscore/zh_CN_/android.xml',
        'osx_code/uk.lproj_/android.xml',
        'osx_code/zh-Hans.lproj_/android.xml',
        'osx_locale/uk_/android.xml',
        'osx_locale/zh-Hans_/android.xml',
        'three_letters_code/ukr_/android.xml',
        'three_letters_code/zho_/android.xml',
        'two_letters_code/uk_/android.xml',
        'two_letters_code/zh_/android.xml',
      ].map(async (relativePath) => {
        expect(await Bun.file(join(ctx.workspace, relativePath)).exists()).toBe(true);
      }),
    );
  });

  test('sets a server-side language mapping and previews the upload without local overrides', async () => {
    await ctx.client.projectsGroupsApi.editProject(ctx.project.id, [
      {
        op: 'replace',
        path: '/languageMapping',
        value: { uk: UK_LANGUAGE_MAPPING, 'zh-CN': ZH_CN_LANGUAGE_MAPPING },
      },
    ]);
    await switchToNoLocalMapping(ctx);

    const result = await ctx.runner.run(['upload', 'translations', '--dryrun']);

    expect(result.exitCode).toBe(0);
    // android_code now resolves from the server mapping (*_crwd), not the removed local override.
    expect(result.stdout).toContain(
      'File android_code/uk-rUA_crwd/android.xml would be queued for translations import',
    );
    expect(result.stdout).toContain(
      'File android_code/zh-rCN_crwd/android.xml would be queued for translations import',
    );
    // Every other group's server value mirrors its old local override, so the path is unchanged.
    expect(result.stdout).toContain('File locale/uk-UA_/android.xml would be queued for translations import');
    expect(result.stdout).toContain('File three_letters_code/zho_/android.xml would be queued for translations import');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('lists target languages using the android_code mapping', async () => {
    const result = await ctx.runner.run(['language', 'list', '--code', 'android_code']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('uk-rUA_crwd');
    expect(result.stdout).toContain('zh-rCN_crwd');
    expect(result.stdout).toContain('Ukrainian');
    expect(result.stdout).toContain('Chinese Simplified');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('lists target languages using the three_letters_code mapping', async () => {
    const result = await ctx.runner.run(['language', 'list', '--code', 'three_letters_code']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('ukr_');
    expect(result.stdout).toContain('zho_');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads translations under the server-side language mapping', async () => {
    const result = await ctx.runner.run(['upload', 'translations']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Importing translations for file 'android_code/uk-rUA_crwd/android.xml'");
    expect(result.stdout).toContain("File 'android_code/uk-rUA_crwd/android.xml'");
    expect(result.stdout).toContain("File 'android_code/zh-rCN_crwd/android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('previews the translation download under the server-side language mapping', async () => {
    const result = await ctx.runner.run(['download', 'translations', '--dryrun']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('android_code/uk-rUA_crwd/android.xml');
    expect(result.stdout).toContain('android_code/zh-rCN_crwd/android.xml');
    expect(result.stdout).toContain('locale/uk-UA_/android.xml');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations under the server-side language mapping', async () => {
    const result = await ctx.runner.run(['download', 'translations']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('File android_code/uk-rUA_crwd/android.xml extracted');
    expect(result.stdout).toContain('File android_code/zh-rCN_crwd/android.xml extracted');
    expect(normalize(result.stdout)).toMatchSnapshot();

    await Promise.all(
      ['android_code/uk-rUA_crwd/android.xml', 'android_code/zh-rCN_crwd/android.xml'].map(async (relativePath) => {
        expect(await Bun.file(join(ctx.workspace, relativePath)).exists()).toBe(true);
      }),
    );
  });
});
