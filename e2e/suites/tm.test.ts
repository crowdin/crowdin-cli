import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import AdmZip from 'adm-zip';
import { writeConfig } from '../helpers/config.ts';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/** Overwrites the workspace's `crowdin.yml` with one of the `alt-configs/<name>.yml` templates. */
async function switchConfig(ctx: SuiteContext, name: string): Promise<void> {
  const template = await Bun.file(join(ctx.workspace, 'alt-configs', `${name}.yml`)).text();
  await writeConfig(ctx.workspace, template, { projectId: ctx.project.id, token: ctx.env.token as string });
}

/** Finds a translation memory's numeric id by its exact name, via the API directly. */
async function findTmId(ctx: SuiteContext, name: string): Promise<number> {
  const response = await ctx.client.translationMemoryApi.withFetchAll().listTm();
  const match = response.data.find((entry) => entry.data.name === name);

  if (!match) {
    throw new Error(`Translation memory '${name}' not found via the API`);
  }

  return match.data.id;
}

/**
 * Every project on Crowdin.com gets an automatically created TM named after it
 * (`Project::getDefaultTmName()` in the PHP backend: `"{$name}'s TM"`).
 */
function defaultTmName(ctx: SuiteContext): string {
  return `${ctx.project.name}'s TM`;
}

/**
 * Order-independent TMX content check, grouped by language: the server re-exports TMX in its own
 * dialect (different `tuid`s, added `creationid`/`creationdate`, `<tu>`/`<tuv>` reordered - the `en`
 * `<tuv>` comes first in the server's own export, `ar` first in the uploaded source), so
 * byte-equality isn't meaningful. Compare the sorted set of `<seg>` texts per `xml:lang`, which the
 * roundtrip/filtering must preserve.
 */
function extractTmxSegmentsByLanguage(xml: string): Record<string, string[]> {
  const byLanguage: Record<string, string[]> = {};

  for (const tuvMatch of xml.matchAll(/<tuv\s+xml:lang="([^"]+)">([\s\S]*?)<\/tuv>/g)) {
    const language = tuvMatch[1] as string;
    const segMatch = /<seg>([\s\S]*?)<\/seg>/.exec(tuvMatch[2] as string);

    if (segMatch) {
      if (!byLanguage[language]) {
        byLanguage[language] = [];
      }

      byLanguage[language].push(segMatch[1] as string);
    }
  }

  for (const language of Object.keys(byLanguage)) {
    (byLanguage[language] as string[]).sort();
  }

  return byLanguage;
}

/** Order-independent line comparison for the exported CSV, matching how bundle.test.ts compares exported text. */
async function sortedLines(path: string): Promise<string[]> {
  const content = await Bun.file(path).text();
  return content.split('\n').sort();
}

/**
 * Order-independent XLSX content check. An xlsx is a zip container, so raw byte-equality isn't
 * reliable (zip/docProps metadata differs run to run) - unzip with `adm-zip` and compare the sorted
 * set of visible text runs from both the shared-strings table and the worksheet's own inline
 * strings, covering either encoding a workbook writer may choose (same approach as glossary.test.ts).
 */
function extractXlsxTexts(path: string): string[] {
  const zip = new AdmZip(path);
  const texts: string[] = [];

  for (const entryName of ['xl/sharedStrings.xml', 'xl/worksheets/sheet1.xml']) {
    const entry = zip.getEntry(entryName);

    if (entry) {
      const xml = entry.getData().toString('utf-8');
      texts.push(...[...xml.matchAll(/<t(?=[\s>])[^>]*>([\s\S]*?)<\/t>/g)].map((m) => m[1] as string));
    }
  }

  return texts.sort();
}

describe('tm', () => {
  let ctx: SuiteContext;
  let tmxId: number;
  let csvId: number;
  let xlsxId: number;

  beforeAll(async () => {
    ctx = await setupSuite('tm');
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('uploads a TMX translation memory, creating it', async () => {
    const result = await ctx.runner.run(['tm', 'upload', 'sources/simple-tm.tmx', '--language', 'en']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Imported in #');
    expect(result.stdout).toContain("'Created in Crowdin CLI (simple-tm.tmx)' translation memory");
    expect(normalize(result.stdout)).toMatchSnapshot();

    tmxId = await findTmId(ctx, 'Created in Crowdin CLI (simple-tm.tmx)');
  });

  test('uploads a CSV translation memory with an explicit scheme, creating it', async () => {
    const result = await ctx.runner.run([
      'tm',
      'upload',
      'sources/simple-tm.csv',
      '--language',
      'uk',
      '--scheme',
      'ar=1',
      '--scheme',
      'de=2',
      '--scheme',
      'en=3',
      '--scheme',
      'uk=4',
      '--scheme',
      'zh-CN=5',
      '--first-line-contains-header',
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("'Created in Crowdin CLI (simple-tm.csv)' translation memory");
    expect(normalize(result.stdout)).toMatchSnapshot();

    csvId = await findTmId(ctx, 'Created in Crowdin CLI (simple-tm.csv)');
  });

  test('uploads an XLSX translation memory with an explicit scheme, creating it', async () => {
    const result = await ctx.runner.run([
      'tm',
      'upload',
      'sources/simple-tm.xlsx',
      '--language',
      'uk',
      '--scheme',
      'ar=1',
      '--scheme',
      'de=2',
      '--scheme',
      'en=3',
      '--scheme',
      'uk=4',
      '--scheme',
      'zh-CN=5',
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("'Created in Crowdin CLI (simple-tm.xlsx)' translation memory");
    expect(normalize(result.stdout)).toMatchSnapshot();

    xlsxId = await findTmId(ctx, 'Created in Crowdin CLI (simple-tm.xlsx)');
  });

  test('lists all translation memories in the project', async () => {
    const result = await ctx.runner.run(['tm', 'list']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(defaultTmName(ctx));
    expect(result.stdout).toContain('Created in Crowdin CLI (simple-tm.tmx)');
    expect(result.stdout).toContain('Created in Crowdin CLI (simple-tm.csv)');
    expect(result.stdout).toContain('Created in Crowdin CLI (simple-tm.xlsx)');
    expect(normalize(result.stdout)).toMatchSnapshot();

    // Cross-check the segment counts the PHP suite asserted via table text, directly via the
    // API - `tm list` renders through `console.table`, which isn't something to hand-assert.
    const tms = await ctx.client.translationMemoryApi.withFetchAll().listTm();
    const segmentsByName = new Map(tms.data.map((entry) => [entry.data.name, entry.data.segmentsCount]));
    expect(segmentsByName.get(defaultTmName(ctx))).toBe(0);
    expect(segmentsByName.get('Created in Crowdin CLI (simple-tm.tmx)')).toBe(4);
    expect(segmentsByName.get('Created in Crowdin CLI (simple-tm.csv)')).toBe(4);
    expect(segmentsByName.get('Created in Crowdin CLI (simple-tm.xlsx)')).toBe(4);
  });

  test('downloads the TMX translation memory by id and format', async () => {
    const file = 'Created in Crowdin CLI (simple-tm.tmx).tmx';

    const result = await ctx.runner.run(['tm', 'download', String(tmxId), '--format', 'tmx']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Building translation memory');
    expect(result.stdout).toContain(`'${file}' downloaded successfully`);
    expect(normalize(result.stdout)).toMatchSnapshot();

    const downloaded = extractTmxSegmentsByLanguage(await Bun.file(join(ctx.workspace, file)).text());
    const expected = extractTmxSegmentsByLanguage(await Bun.file(join(ctx.workspace, 'expected/simple-tm.tmx')).text());
    expect(downloaded).toEqual(expected);
  });

  test('downloads the CSV translation memory by id and format', async () => {
    const file = 'Created in Crowdin CLI (simple-tm.csv).csv';

    const result = await ctx.runner.run(['tm', 'download', String(csvId), '--format', 'csv']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Building translation memory');
    expect(result.stdout).toContain(`'${file}' downloaded successfully`);
    expect(normalize(result.stdout)).toMatchSnapshot();

    expect(await sortedLines(join(ctx.workspace, file))).toEqual(
      await sortedLines(join(ctx.workspace, 'expected/simple-tm.csv')),
    );
  });

  test('downloads the XLSX translation memory by id and format', async () => {
    const file = 'Created in Crowdin CLI (simple-tm.xlsx).xlsx';

    const result = await ctx.runner.run(['tm', 'download', String(xlsxId), '--format', 'xlsx']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Building translation memory');
    expect(result.stdout).toContain(`'${file}' downloaded successfully`);
    expect(normalize(result.stdout)).toMatchSnapshot();

    expect(extractXlsxTexts(join(ctx.workspace, file))).toEqual(
      extractXlsxTexts(join(ctx.workspace, 'expected/simple-tm.xlsx')),
    );
  });

  test('downloads the TMX translation memory filtered by a language pair', async () => {
    const file = 'download/simple-tm_en-uk.tmx';

    const result = await ctx.runner.run([
      'tm',
      'download',
      String(tmxId),
      '--to',
      file,
      '--source-language-id',
      'en',
      '--target-language-id',
      'uk',
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(`'${file}' downloaded successfully`);
    expect(normalize(result.stdout)).toMatchSnapshot();

    const downloaded = extractTmxSegmentsByLanguage(await Bun.file(join(ctx.workspace, file)).text());
    const expected = extractTmxSegmentsByLanguage(
      await Bun.file(join(ctx.workspace, 'expected/simple-tm_en-uk.tmx')).text(),
    );
    expect(downloaded).toEqual(expected);
  });

  test('downloads the TMX translation memory without an explicit format', async () => {
    const file = 'Created in Crowdin CLI (simple-tm.tmx).tmx';

    const result = await ctx.runner.run(['tm', 'download', String(tmxId)]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(`'${file}' downloaded successfully`);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test("downloads the project's default translation memory by id", async () => {
    const defaultTmId = await findTmId(ctx, defaultTmName(ctx));
    const file = `${defaultTmName(ctx)}.tmx`;

    const result = await ctx.runner.run(['tm', 'download', String(defaultTmId)]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(`'${file}' downloaded successfully`);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('lists translation memories authenticating via -T against a config without an api_token', async () => {
    await switchConfig(ctx, 'without-token');

    const result = await ctx.runner.run(['tm', 'list', '-T', ctx.env.token as string]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(defaultTmName(ctx));
    expect(result.stdout).toContain('Created in Crowdin CLI (simple-tm.tmx)');
    expect(result.stdout).toContain('Created in Crowdin CLI (simple-tm.csv)');
    expect(result.stdout).toContain('Created in Crowdin CLI (simple-tm.xlsx)');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });
});
