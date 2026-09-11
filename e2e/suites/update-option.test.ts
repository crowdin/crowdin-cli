import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * Covers the `update_option` config key (`lib/config.ts:18`, sent at
 * `UploadSourcesCommand.ts:384`). Unlike the other per-file keys it is not stored on the file, so
 * it cannot be read back - it only takes effect while an *existing* file is being replaced, and
 * only for strings whose text changed. Proving it therefore needs the whole cycle: upload,
 * translate, edit the source, re-upload.
 *
 * The config carries two groups so the result is a contrast rather than a claim. `kept.json`
 * declares `update_as_unapproved` (the API's `keep_translations`) and `plain.json` declares
 * nothing; both are translated and then edited identically, so whatever difference appears at the
 * end is the key's doing.
 */
const LANGUAGE = 'uk';

describe('update_option', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    ctx = await setupSuite('update-option', { targetLanguageIds: [LANGUAGE] });
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  async function findString(fileName: string): Promise<number> {
    const files = await ctx.client.sourceFilesApi.withFetchAll().listProjectFiles(ctx.project.id);
    const file = files.data.find((entry) => entry.data.path === `/sources/${fileName}`);

    if (!file) {
      throw new Error(`File '${fileName}' not found via the API`);
    }

    const strings = await ctx.client.sourceStringsApi
      .withFetchAll()
      .listProjectStrings(ctx.project.id, { fileId: file.data.id });
    const match = strings.data[0];

    if (!match) {
      throw new Error(`No strings found in '${fileName}'`);
    }

    return match.data.id;
  }

  async function approvalCount(stringId: number): Promise<number> {
    const response = await ctx.client.stringTranslationsApi.listTranslationApprovals(ctx.project.id, {
      stringId,
      languageId: LANGUAGE,
    });

    return response.data.length;
  }

  async function translationCount(stringId: number): Promise<number> {
    const response = await ctx.client.stringTranslationsApi.listStringTranslations(ctx.project.id, stringId, LANGUAGE);

    return response.data.length;
  }

  test('uploads both sources and translates them', async () => {
    const upload = await ctx.runner.run(['upload', 'sources']);

    expect(upload).toMatchObject({ exitCode: 0 });

    for (const fileName of ['kept.json', 'plain.json', 'approved.json']) {
      const stringId = await findString(fileName);

      const translation = await ctx.client.stringTranslationsApi.addTranslation(ctx.project.id, {
        stringId,
        languageId: LANGUAGE,
        text: 'Привіт',
      });

      expect(await translationCount(stringId)).toBe(1);

      // Only the third file's option claims to carry approvals through an update.
      if (fileName === 'approved.json') {
        await ctx.client.stringTranslationsApi.addApproval(ctx.project.id, {
          translationId: translation.data.id,
        });

        expect(await approvalCount(stringId)).toBe(1);
      }
    }
  });

  test('keeps the translation of a changed string only where update_option asks for it', async () => {
    // Same edit to both files: the string's text changes, which is the only case the option
    // governs - an untouched string keeps its translation either way.
    for (const fileName of ['kept.json', 'plain.json', 'approved.json']) {
      await Bun.write(join(ctx.workspace, 'sources', fileName), '{\n  "greeting": "Hello there"\n}\n');
    }

    const result = await ctx.runner.run(['upload', 'sources', '--output', 'json']);

    expect(result).toMatchObject({ exitCode: 0 });

    // Assert the update actually happened before reading translations off it. A run where the API
    // did not replace the files would otherwise fail further down as a translation-count mismatch,
    // which says nothing about why.
    const uploaded = JSON.parse(result.stdout) as { path: string; action: string }[];

    expect(uploaded.map((file) => file.action)).toEqual(['updated', 'updated', 'updated']);

    // The string ids change with the text, so look them up again rather than reusing the old ones.
    const keptTranslations = await translationCount(await findString('kept.json'));
    const plainTranslations = await translationCount(await findString('plain.json'));

    expect(keptTranslations).toBe(1);
    expect(plainTranslations).toBe(0);
  });

  test('carries the approval through as well with update_without_changes', async () => {
    // The other half of UPDATE_OPTION_MAP: keep_translations_and_approvals, where the translation
    // survives the edit still approved rather than reset to unapproved.
    const stringId = await findString('approved.json');

    expect(await translationCount(stringId)).toBe(1);
    expect(await approvalCount(stringId)).toBe(1);
  });
});
