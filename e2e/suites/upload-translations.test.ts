import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { createTestProject, deleteTestProject } from '../helpers/project.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * Covers the flags `upload translations` owns (`cli/commands/upload/UploadTranslationsCommand.ts`).
 * Several suites drive this command, including into failure, so its warnings are well covered; what
 * had none are the two import flags and two guards.
 *
 * `--import-eq-suggestions` and `--translate-hidden` change nothing on disk and nothing in the
 * command's own output - the effect is only visible in what the API stored - so each is asserted by
 * reading the translation back. `export-options.test.ts` runs `--auto-approve-imported` but only
 * checks stdout, which is why these live here instead.
 *
 * Not attempted: the no-manager-access guard at `:76`, which needs a project the token can read but
 * not manage.
 */
const LANGUAGE = 'uk';

describe('upload translations', () => {
  let ctx: SuiteContext;
  let stringsBasedProjectId: number;
  let sharedStringId: number;
  let secretStringId: number;

  beforeAll(async () => {
    ctx = await setupSuite('upload-translations', { targetLanguageIds: [LANGUAGE] });
    stringsBasedProjectId = (
      await createTestProject(ctx.client, { suite: 'upload-translations-strings', stringsBased: true })
    ).id;
  });

  afterAll(async () => {
    if (ctx && stringsBasedProjectId && !ctx.env.keep) {
      try {
        await deleteTestProject(ctx.client, stringsBasedProjectId);
      } catch (error) {
        console.error(`Failed to delete project #${stringsBasedProjectId}: ${error}`);
      }
    }

    await teardownSuite(ctx);
  });

  async function findStringId(identifier: string): Promise<number> {
    const response = await ctx.client.sourceStringsApi.withFetchAll().listProjectStrings(ctx.project.id);
    const match = response.data.find((entry) => entry.data.identifier === identifier);

    if (!match) {
      throw new Error(`Source string '${identifier}' not found via the API`);
    }

    return match.data.id;
  }

  /** How many translations the API holds for a string - 0 until something imports one. */
  async function translationCount(stringId: number): Promise<number> {
    const response = await ctx.client.stringTranslationsApi.listStringTranslations(ctx.project.id, stringId, LANGUAGE);

    return response.data.length;
  }

  test('uploads the sources the rest of the suite translates', async () => {
    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result).toMatchObject({ exitCode: 0 });

    sharedStringId = await findStringId('shared');
    secretStringId = await findStringId('secret');

    // Hidden from translators, so `--translate-hidden` has something to decide about below.
    await ctx.client.sourceStringsApi.editString(ctx.project.id, secretStringId, [
      { op: 'replace', path: '/isHidden', value: true },
    ]);
  });

  test('imports neither an identical string nor a hidden one by default', async () => {
    const result = await ctx.runner.run(['upload', 'translations']);

    expect(result).toMatchObject({ exitCode: 0 });

    // `shared` carries the same text in source and translation; `secret` is hidden.
    expect(await translationCount(sharedStringId)).toBe(0);
    expect(await translationCount(secretStringId)).toBe(0);
  });

  test('imports a translation equal to the source with --import-eq-suggestions', async () => {
    const result = await ctx.runner.run(['upload', 'translations', '--import-eq-suggestions']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(await translationCount(sharedStringId)).toBeGreaterThan(0);
    // Still untouched: this flag decides about identical text, not about hidden strings, so the
    // next test cannot pass on the back of this run.
    expect(await translationCount(secretStringId)).toBe(0);
  });

  test('imports a translation for a hidden string with --translate-hidden', async () => {
    const result = await ctx.runner.run(['upload', 'translations', '--translate-hidden']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(await translationCount(secretStringId)).toBeGreaterThan(0);
  });

  test('rejects a language the project does not target', async () => {
    const result = await ctx.runner.run(['upload', 'translations', '-l', 'de']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Language 'de' does not exist in the project");
  });

  test('requires a branch for a string-based project', async () => {
    const result = await ctx.runner.run(['upload', 'translations', '--project-id', String(stringsBasedProjectId)]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('A branch is required to upload translations for a strings-based project');
  });
});
