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
 * The language outlives the project, so a second run must tolerate "code already taken"; every
 * other error still propagates.
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
    expect(result.stdout).toContain("File '1_android.xml'");
    expect(result.stdout).toContain("File '2_android.xml'");
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
    // The upload fixtures sit at the download's own paths, so clear them first - otherwise the
    // comparison is against the local copy, not what the server returned.
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
