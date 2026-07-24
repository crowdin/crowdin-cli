import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { type Client, CrowdinValidationError, type LanguagesModel } from '@crowdin/crowdin-api-client';
import { resolveEnv } from '../helpers/env.ts';
import { normalize } from '../helpers/normalize.ts';
import { createApiClient } from '../helpers/project.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

const DOTHRAKI_LANGUAGE: LanguagesModel.AddLanguageRequest = {
  name: 'Dothraki',
  code: 'dtk',
  localeCode: 'dtk',
  threeLettersCode: 'dtk',
  textDirection: 'ltr',
  pluralCategoryNames: ['one', 'other'],
};

/**
 * Adds the custom 'Dothraki' language to the whole Crowdin account — this is account-level
 * (`POST /languages`), not project-scoped, and must exist *before* a project can be created with
 * it as a target language. Mirrors the PHP test's
 * `self::$user->client()->languages()->addLanguage(self::$user->getId(), 'Dothraki', 'dtk', 'dtk', 'dtk')`.
 *
 * Idempotent: e2e projects get deleted after every run, but an account-level custom language is
 * not project-scoped and persists across suite runs, so a second run must tolerate "code already
 * taken" (`languageFieldUniqueInvalid`, confirmed in
 * crowdin-backend/tests/Api/Public/FileBased/Common/Languages/LanguagesPostErrorsCest.php) instead
 * of failing setup. Any other error (bad payload, auth failure, etc.) still propagates.
 */
async function ensureDothrakiLanguage(client: Client): Promise<void> {
  try {
    await client.languagesApi.addCustomLanguage(DOTHRAKI_LANGUAGE);
  } catch (error) {
    const alreadyExists =
      error instanceof CrowdinValidationError &&
      error.validationCodes.some((entry) => entry.codes.includes('languageFieldUniqueInvalid'));

    if (!alreadyExists) {
      throw error;
    }
  }
}

describe('custom language', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    const env = resolveEnv();
    if (!env.token) {
      throw new Error('CROWDIN_E2E_TOKEN is not set. E2E suites require a dedicated test-account token.');
    }

    await ensureDothrakiLanguage(createApiClient(env));

    ctx = await setupSuite('custom-language', { targetLanguageIds: ['uk', 'dtk'] });
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('uploads sources', async () => {
    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'sources/1_android.xml'");
    expect(result.stdout).toContain("File 'sources/2_android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads translations for both the custom and standard target language', async () => {
    const result = await ctx.runner.run(['upload', 'translations']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'translations/dtk/1_android.xml'");
    expect(result.stdout).toContain("File 'translations/dtk/2_android.xml'");
    expect(result.stdout).toContain("File 'translations/uk/1_android.xml'");
    expect(result.stdout).toContain("File 'translations/uk/2_android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations for both the custom and standard target language', async () => {
    // The fixture ships local translations/ files (used by the upload test above) at the exact
    // same path the download will write to - clear them first so the file-equality assertions
    // below compare against what the server actually returned, not the pre-existing local copy.
    await rm(join(ctx.workspace, 'translations'), { recursive: true, force: true });

    const result = await ctx.runner.run(['download', 'translations']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();

    for (const language of ['dtk', 'uk']) {
      for (const file of ['1_android.xml', '2_android.xml']) {
        const downloaded = await Bun.file(join(ctx.workspace, 'translations', language, file)).text();
        const expected = await Bun.file(join(ctx.workspace, 'expected', language, file)).text();
        expect(downloaded).toBe(expected);
      }
    }
  });
});
