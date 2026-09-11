import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { type SuiteContext, setupSuite, switchConfig, teardownSuite } from '../helpers/suite.ts';

/**
 * Covers the per-file config keys that reach the API as a file's `exportOptions` / `importOptions`
 * (`lib/upload/fileOptions.ts`). None of them had a fixture anywhere: they change nothing locally
 * and nothing in the command's output, so the only way to see them is to read the uploaded file
 * back.
 *
 * They are extension-gated, which is why one config carries three file groups - `escape_quotes` and
 * `escape_special_characters` apply to `.properties` alone, `export_quotes` to `.js` alone, and the
 * parser options to `.xml`. A key set on the wrong extension is silently dropped, so the grouping
 * is the point rather than an accident of the fixture.
 */
describe('config file options', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    // Two targets so `export_languages: [uk]` has something to narrow - with one, its test would
    // pass whether or not the key was read.
    ctx = await setupSuite('config-file-options', { targetLanguageIds: ['uk', 'it'] });
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  /** The file the project holds for a source path, with the options the upload attached to it. */
  async function projectFile(path: string) {
    const response = await ctx.client.sourceFilesApi.withFetchAll().listProjectFiles(ctx.project.id);
    const match = response.data.find((entry) => entry.data.path === path);

    if (!match) {
      throw new Error(`File '${path}' not found via the API`);
    }

    return match.data as unknown as {
      exportOptions?: Record<string, unknown>;
      importOptions?: Record<string, unknown>;
    };
  }

  test('uploads every source group', async () => {
    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result).toMatchObject({ exitCode: 0 });
  });

  test('sends the .properties escape options', async () => {
    const file = await projectFile('/sources/messages.properties');

    expect(file.exportOptions).toMatchObject({ escapeQuotes: 3, escapeSpecialCharacters: 0 });
  });

  test('sends the .js export quotes', async () => {
    const file = await projectFile('/sources/script.js');

    expect(file.exportOptions).toMatchObject({ exportQuotes: 'double' });
  });

  test('sends the .xml parser options', async () => {
    // The fixture is a generic `<catalog>` with an explicit `type: xml`, not a `<resources>` file:
    // Crowdin types that as Android XML, where these options do not apply, and stores only
    // contentSegmentation - silently, with the other three dropped and no error anywhere.
    const file = await projectFile('/sources/strings.xml');

    expect(file.importOptions).toMatchObject({
      contentSegmentation: false,
      translateContent: false,
      translateAttributes: false,
      translatableElements: ['/catalog/item'],
    });
  });

  test('attaches the labels the config declares to every uploaded string', async () => {
    await switchConfig(ctx, 'labels-and-languages');

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result).toMatchObject({ exitCode: 0 });

    // The config-side counterpart of `upload sources --label`.
    const labels = await ctx.client.labelsApi.withFetchAll().listLabels(ctx.project.id);
    const configured = labels.data.find((entry) => entry.data.title === 'from-config');

    expect(configured).toBeDefined();

    const file = await projectFile('/sources/labelled.json');
    const strings = await ctx.client.sourceStringsApi
      .withFetchAll()
      .listProjectStrings(ctx.project.id, { fileId: (file as unknown as { id: number }).id });

    expect(strings.data.length).toBeGreaterThan(0);
    expect(strings.data.every((entry) => entry.data.labelIds?.includes(configured?.data.id as number))).toBe(true);
  });

  test('narrows the download to the languages export_languages names', async () => {
    const result = await ctx.runner.run(['download', 'translations', '--dryrun', '--output', 'plain']);

    expect(result).toMatchObject({ exitCode: 0 });
    // The project targets uk and it; the config names uk alone, so it must not appear.
    expect(result.stdout.split('\n').filter(Boolean)).toEqual(['translations/uk/labelled.json']);
  });

  test('treats a file as multilingual without a scheme', async () => {
    await switchConfig(ctx, 'multilingual');

    // `multilingual: true` alone makes isMultilingualFile true (lib/config.ts:60), so the pattern
    // may carry no language placeholder; every other multilingual fixture gets there via `scheme:`.
    const result = await ctx.runner.run(['config', 'translations', '--output', 'plain']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout.split('\n').filter(Boolean)).toEqual(['translations/all.json']);
  });
});
